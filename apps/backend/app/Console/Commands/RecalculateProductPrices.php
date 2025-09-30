<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Services\PricingService;

class RecalculateProductPrices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:recalculate-prices 
                            {--dry-run : Solo mostrar qué se haría sin ejecutar}
                            {--batch=100 : Procesar en lotes de N productos}
                            {--force : Forzar recálculo incluso si sale_price ya existe}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalcula los precios de venta de todos los productos usando PricingService';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $pricingService = app(PricingService::class);
        $dryRun = $this->option('dry-run');
        $batchSize = (int) $this->option('batch');
        $force = $this->option('force');

        // Query base
        $query = Product::query();
        
        if (!$force) {
            $query->where(function($q) {
                $q->whereNull('sale_price')
                  ->orWhere('sale_price', 0);
            });
        }

        $totalProducts = $query->count();
        
        if ($totalProducts === 0) {
            $this->info('No hay productos que necesiten recálculo.');
            return;
        }

        $this->info("Procesando {$totalProducts} productos...");
        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se guardarán cambios');
        }

        $bar = $this->output->createProgressBar($totalProducts);
        $bar->start();

        $processed = 0;
        $errors = 0;
        $updated = 0;

        $query->chunk($batchSize, function ($products) use ($pricingService, $dryRun, $bar, &$processed, &$errors, &$updated) {
            foreach ($products as $product) {
                try {
                    $oldPrice = $product->sale_price;
                    
                    // Recalcular usando PricingService
                    $newSalePrice = $pricingService->calculateSalePrice(
                        (float) $product->unit_price,
                        $product->currency,
                        (float) $product->markup,
                        $product->iva_id
                    );

                    if (!$dryRun) {
                        $product->update(['sale_price' => $newSalePrice]);
                        $updated++;
                    }

                    // Mostrar algunos ejemplos en dry-run
                    if ($dryRun && $processed < 5) {
                        $this->line("\nProducto {$product->id}: {$product->description}");
                        $this->line("  Precio anterior: " . ($oldPrice ?? 'NULL'));
                        $this->line("  Precio nuevo: {$newSalePrice}");
                        $this->line("  Unit Price: {$product->unit_price} | Markup: {$product->markup} | Currency: {$product->currency}");
                    }

                    $processed++;

                } catch (\Exception $e) {
                    $errors++;
                    $this->error("\nError en producto {$product->id}: " . $e->getMessage());
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        
        $this->info("✅ Procesados: {$processed} productos");
        if ($errors > 0) {
            $this->error("❌ Errores: {$errors} productos");
        }
        
        if ($dryRun) {
            $this->warn('Ejecuta sin --dry-run para aplicar los cambios');
        } else {
            $this->info(" Recálculo completado! {$updated} productos actualizados.");
        }

        // Verificación final
        if (!$dryRun) {
            $remaining = Product::where(function($q) {
                $q->whereNull('sale_price')->orWhere('sale_price', 0);
            })->count();
            
            if ($remaining > 0) {
                $this->warn("⚠️  Aún quedan {$remaining} productos sin precio de venta");
            } else {
                $this->info("🎉 Todos los productos tienen precio de venta calculado");
            }
        }
    }
}