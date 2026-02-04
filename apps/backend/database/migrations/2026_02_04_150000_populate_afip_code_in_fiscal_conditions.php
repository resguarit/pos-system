<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Actualiza los afip_code de fiscal_conditions basándose en el nombre.
     */
    public function up(): void
    {
        // Mapeo de nombres (case-insensitive) a códigos AFIP
        $mappings = [
            'responsable inscripto' => '1',
            'responsable inscrito' => '1',
            'ri' => '1',
            'exento' => '4',
            'iva exento' => '4',
            'consumidor final' => '5',
            'cf' => '5',
            'monotributista' => '6',
            'monotributo' => '6',
        ];

        foreach ($mappings as $name => $code) {
            $updated = DB::table('fiscal_conditions')
                ->whereRaw('LOWER(name) = ?', [$name])
                ->whereNull('afip_code')
                ->update(['afip_code' => $code]);

            if ($updated > 0) {
                Log::info("Migración: Actualizado afip_code={$code} para fiscal_condition con nombre '{$name}' ({$updated} registros)");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertir - los valores son correctos
    }
};
