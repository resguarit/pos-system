<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Añade UNIQUE(product_id, branch_id) para evitar filas duplicadas.
     * Maneja la consolidación de duplicados incluyendo soft-deletes.
     */
    public function up(): void
    {
        // 1. Identificar duplicados mirando TODAS las filas (incluso eliminadas)
        // Agrupamos por product_id y branch_id
        $duplicates = DB::table('stocks')
            ->select('product_id', 'branch_id')
            ->groupBy('product_id', 'branch_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            // Obtener todas las filas para esta combinación, ordenadas por ID
            $rows = DB::table('stocks')
                ->where('product_id', $duplicate->product_id)
                ->where('branch_id', $duplicate->branch_id)
                ->orderBy('id')
                ->get();

            // Separar en activas y eliminadas
            $activeRows = $rows->filter(fn($r) => is_null($r->deleted_at));
            $deletedRows = $rows->filter(fn($r) => !is_null($r->deleted_at));

            if ($activeRows->isNotEmpty()) {
                // CASO 1: Hay al menos una fila activa.
                // Nos quedamos con la primera activa (o la más reciente, aquí usamos la primera por ID para consistencia)
                $keepRow = $activeRows->first();

                // Si hay OTRAS filas activas, sumamos su stock al principal
                $otherActiveRows = $activeRows->where('id', '!=', $keepRow->id);

                if ($otherActiveRows->isNotEmpty()) {
                    $sumStock = $otherActiveRows->sum('current_stock');
                    // Actualizamos la fila que nos quedamos
                    DB::table('stocks')->where('id', $keepRow->id)->increment('current_stock', $sumStock);

                    // Eliminamos físicamente las otras activas ya fusionadas
                    DB::table('stocks')->whereIn('id', $otherActiveRows->pluck('id'))->delete();
                }

                // Eliminamos físicamente TODAS las filas eliminadas (soft-deleted) que causan conflicto
                // Ya no son necesarias porque tenemos una activa válida
                if ($deletedRows->isNotEmpty()) {
                    DB::table('stocks')->whereIn('id', $deletedRows->pluck('id'))->delete();
                }

            } else {
                // CASO 2: Solo hay filas eliminadas.
                // Nos quedamos con una sola (la última eliminada, por ejemplo) para mantener historial si es necesario,
                // eliminamos físicamente el resto para cumplir la constraint.
                $keepRow = $deletedRows->sortByDesc('deleted_at')->first();
                $deleteIds = $deletedRows->where('id', '!=', $keepRow->id)->pluck('id');

                if ($deleteIds->isNotEmpty()) {
                    DB::table('stocks')->whereIn('id', $deleteIds)->delete();
                }
            }
        }

        // 2. Crear el índice único si no existe
        $indexExists = collect(DB::select("SHOW INDEX FROM stocks WHERE Key_name = 'stocks_product_branch_unique'"))->isNotEmpty();
        if (!$indexExists) {
            Schema::table('stocks', function (Blueprint $table) {
                // Aseguramos que la restricción se cree
                $table->unique(['product_id', 'branch_id'], 'stocks_product_branch_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropUnique('stocks_product_branch_unique');
        });
    }
};
