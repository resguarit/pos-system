<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\ProductCostHistory;
use Illuminate\Support\Facades\Log;

class SeedProductCostHistory extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'product-cost-history:seed-initial 
                            {--force : Ejecutar sin confirmación}
                            {--batch=100 : Procesar en lotes de N registros}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Registra el costo actual de todos los productos como su primer registro histórico';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('📊 Iniciando registro de historial inicial de costos...');

        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres registrar el historial inicial de costos para todos los productos?')) {
                $this->info('Operación cancelada.');
                return 0;
            }
        }

        try {
            $batchSize = (int) $this->option('batch');
            $totalProducts = Product::count();
            $processed = 0;
            $skipped = 0;
            $errors = 0;

            $this->info("Total de productos a procesar: {$totalProducts}");
            $this->newLine();

            $bar = $this->output->createProgressBar($totalProducts);
            $bar->start();

            Product::chunk($batchSize, function ($products) use (&$processed, &$skipped, &$errors, $bar) {
                foreach ($products as $product) {
                    try {
                        // Verificar si ya tiene historial
                        $hasHistory = ProductCostHistory::where('product_id', $product->id)->exists();

                        if ($hasHistory) {
                            $skipped++;
                            $bar->advance();
                            continue;
                        }

                        // Solo registrar si el producto tiene un costo válido
                        if ($product->unit_price === null || $product->unit_price <= 0) {
                            $skipped++;
                            $bar->advance();
                            continue;
                        }

                        // Registrar el costo actual como historial inicial
                        ProductCostHistory::create([
                            'product_id' => $product->id,
                            'previous_cost' => null, // No hay costo anterior (es el primero)
                            'new_cost' => $product->unit_price,
                            'currency' => $product->currency ?? 'ARS',
                            'source_type' => 'manual',
                            'source_id' => null,
                            'notes' => 'Registro inicial del costo del producto',
                            'user_id' => null, // No hay usuario específico para el registro inicial
                        ]);

                        $processed++;
                    } catch (\Exception $e) {
                        $errors++;
                        Log::error("Error registrando historial inicial para producto {$product->id}: " . $e->getMessage());
                    }

                    $bar->advance();
                }
            });

            $bar->finish();
            $this->newLine(2);

            $this->info("✅ Proceso completado:");
            $this->line("   - Productos procesados: {$processed}");
            $this->line("   - Productos omitidos (ya tenían historial): {$skipped}");
            if ($errors > 0) {
                $this->warn("   - Errores: {$errors}");
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error al procesar: ' . $e->getMessage());
            Log::error("Error en comando seed-product-cost-history: " . $e->getMessage());
            return 1;
        }
    }
}
