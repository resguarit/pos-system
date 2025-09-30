<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Database\Seeders\Traits\HandlesDuplicates;

class SaleIvaSeeder extends Seeder
{
    use HandlesDuplicates;
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        $saleIds = DB::table('sales_header')->pluck('id');
        $ivaIds = DB::table('ivas')->pluck('id');
        
        if ($saleIds->isEmpty() || $ivaIds->isEmpty()) {
            if ($this->command) {
                $this->command->warn('⚠️  No hay ventas o tipos de IVA disponibles. Saltando SaleIvaSeeder.');
            }
            return;
        }
        
        $records = [];
        foreach ($saleIds as $saleId) {
            // Solo un tipo de IVA por venta
            $ivaId = $faker->randomElement($ivaIds);
            $baseAmount = $faker->randomFloat(2, 100, 5000);
            $ivaAmount = $baseAmount * 0.21;
            
            $records[] = [
                'sale_header_id' => $saleId,
                'iva_id' => $ivaId,
                'base_amount' => $baseAmount,
                'iva_amount' => $ivaAmount,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        // Usar el trait para evitar duplicados
        $inserted = $this->insertWithoutDuplicates('sale_ivas', $records, ['sale_header_id', 'iva_id']);
        
        if ($this->command) {
            $this->command->info("✅ SaleIvaSeeder completado - {$inserted} registros insertados");
        }
    }
}
