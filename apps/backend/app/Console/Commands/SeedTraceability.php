<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SeedTraceability extends Command
{
    protected $signature = 'traceability:seed
                            {--force : Ejecutar sin confirmación}
                            {--batch=200 : Procesar en lotes de N registros}';

    protected $description = 'Agrega registros de trazabilidad inicial para productos que no tienen movimientos (por combinación producto/sucursal)';

    public function handle()
    {
        $this->info('📦 Iniciando carga de registros de trazabilidad por producto/sucursal...');

        if (!$this->option('force')) {
            if (!$this->confirm('¿Agregar registros de trazabilidad inicial para productos sin movimientos?')) {
                $this->info('Operación cancelada.');
                return 0;
            }
        }

        try {
            $batchSize = (int) $this->option('batch');
            $processed = 0;
            $skipped = 0;
            $errors = 0;

            $totalStocks = Stock::count();
            $this->info("Total de combinaciones producto/sucursal a revisar: {$totalStocks}");
            $this->newLine();

            $bar = $this->output->createProgressBar($totalStocks);
            $bar->start();

            $systemUserId = User::whereHas('role', fn ($q) => $q->whereIn('name', ['Admin', 'Administrador']))->value('id');

            Stock::with(['product', 'branch'])
                ->chunk($batchSize, function ($stocks) use (&$processed, &$skipped, &$errors, $bar, $systemUserId) {
                    foreach ($stocks as $stock) {
                        try {
                            $hasMovement = StockMovement::where('product_id', $stock->product_id)
                                ->where('branch_id', $stock->branch_id)
                                ->exists();

                            if ($hasMovement) {
                                $skipped++;
                                $bar->advance();
                                continue;
                            }

                            $product = $stock->product ?? Product::find($stock->product_id);
                            if (!$product) {
                                $skipped++;
                                $bar->advance();
                                continue;
                            }

                            StockMovement::create([
                                'product_id' => $stock->product_id,
                                'branch_id' => $stock->branch_id,
                                'quantity' => (float) $stock->current_stock,
                                'type' => 'Initial',
                                'user_id' => $systemUserId,
                                'current_stock_balance' => (float) $stock->current_stock,
                                'unit_price_snapshot' => $product->unit_price ?? 0,
                                'sale_price_snapshot' => $product->sale_price ?? 0,
                                'notes' => 'Carga inicial de trazabilidad (script traceability:seed)',
                            ]);

                            $processed++;
                        } catch (\Exception $e) {
                            $errors++;
                            Log::warning("traceability:seed producto {$stock->product_id} sucursal {$stock->branch_id}: " . $e->getMessage());
                        }

                        $bar->advance();
                    }
                });

            $bar->finish();
            $this->newLine(2);

            $this->info('✅ Proceso completado:');
            $this->line("   - Registros creados: {$processed}");
            $this->line("   - Omitidos (ya tenían trazabilidad): {$skipped}");
            if ($errors > 0) {
                $this->warn("   - Errores: {$errors}");
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('traceability:seed ' . $e->getMessage());
            return 1;
        }
    }
}
