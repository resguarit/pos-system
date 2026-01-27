<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade UNIQUE(product_id, branch_id) para evitar filas duplicadas y
     * permitir manejo de concurrencia en getOrCreateStockLocked (StockService).
     * Consolida duplicados existentes antes de crear el índice.
     */
    public function up(): void
    {
        $baseQuery = DB::table('stocks');
        if (Schema::hasColumn('stocks', 'deleted_at')) {
            $baseQuery->whereNull('deleted_at');
        }

        $duplicates = (clone $baseQuery)
            ->select('product_id', 'branch_id')
            ->groupBy('product_id', 'branch_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $row) {
            $q = DB::table('stocks')->where('product_id', $row->product_id)->where('branch_id', $row->branch_id);
            if (Schema::hasColumn('stocks', 'deleted_at')) {
                $q->whereNull('deleted_at');
            }
            $ids = $q->orderBy('id')->pluck('id');
            $keepId = $ids->first();
            $deleteIds = $ids->slice(1)->all();

            if (count($deleteIds) > 0) {
                $sum = DB::table('stocks')->whereIn('id', $ids->toArray())->sum('current_stock');
                $minStock = DB::table('stocks')->whereIn('id', $ids->toArray())->min('min_stock');
                $maxStock = DB::table('stocks')->whereIn('id', $ids->toArray())->max('max_stock');
                DB::table('stocks')->where('id', $keepId)->update([
                    'current_stock' => (int) $sum,
                    'min_stock' => (int) $minStock,
                    'max_stock' => (int) $maxStock,
                ]);
                DB::table('stocks')->whereIn('id', $deleteIds)->delete();
            }
        }

        $indexExists = collect(DB::select("SHOW INDEX FROM stocks WHERE Key_name = 'stocks_product_branch_unique'"))->isNotEmpty();
        if (! $indexExists) {
            Schema::table('stocks', function (Blueprint $table) {
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
