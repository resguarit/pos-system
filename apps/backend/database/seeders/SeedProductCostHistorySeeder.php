<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductCostHistory;
use Illuminate\Support\Facades\Log;

class SeedProductCostHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('📊 Registrando historial inicial de costos para todos los productos...');

        $totalProducts = Product::count();
        $processed = 0;
        $skipped = 0;

        Product::chunk(100, function ($products) use (&$processed, &$skipped) {
            foreach ($products as $product) {
                try {
                    // Verificar si ya tiene historial
                    $hasHistory = ProductCostHistory::where('product_id', $product->id)->exists();

                    if ($hasHistory) {
                        $skipped++;
                        continue;
                    }

                    // Solo registrar si el producto tiene un costo válido
                    if ($product->unit_price === null || $product->unit_price <= 0) {
                        $skipped++;
                        continue;
                    }

                    // Registrar el costo actual como historial inicial
                    ProductCostHistory::create([
                        'product_id' => $product->id,
                        'previous_cost' => null,
                        'new_cost' => $product->unit_price,
                        'currency' => $product->currency ?? 'ARS',
                        'source_type' => 'manual',
                        'source_id' => null,
                        'notes' => 'Registro inicial del costo del producto',
                        'user_id' => null,
                    ]);

                    $processed++;
                } catch (\Exception $e) {
                    Log::error("Error registrando historial inicial para producto {$product->id}: " . $e->getMessage());
                }
            }
        });

        $this->command->info("✅ Historial inicial registrado:");
        $this->command->line("   - Productos procesados: {$processed}");
        $this->command->line("   - Productos omitidos: {$skipped}");
    }
}
