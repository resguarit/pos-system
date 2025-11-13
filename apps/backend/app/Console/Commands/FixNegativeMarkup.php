<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Support\Facades\DB;

class FixNegativeMarkup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:fix-negative-markup 
                            {--dry-run : Solo mostrar qué se haría sin ejecutar}
                            {--fix : Corregir los markups negativos}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Identifica y corrige productos con markup negativo en producción';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $pricingService = app(PricingService::class);
        $dryRun = $this->option('dry-run');
        $fix = $this->option('fix');

        $this->info('🔍 Buscando productos con markup negativo...');
        $this->newLine();

        // Buscar productos con markup negativo
        $productsWithNegativeMarkup = Product::where('markup', '<', 0)
            ->with(['iva'])
            ->get();

        if ($productsWithNegativeMarkup->isEmpty()) {
            $this->info('✅ No se encontraron productos con markup negativo.');
            return;
        }

        $this->warn("⚠️  Se encontraron {$productsWithNegativeMarkup->count()} productos con markup negativo:");
        $this->newLine();

        $fixed = 0;
        $errors = 0;

        foreach ($productsWithNegativeMarkup as $product) {
            $this->line("ID: {$product->id} | Código: {$product->code}");
            $this->line("  Descripción: {$product->description}");
            $this->line("  Unit Price: {$product->unit_price} {$product->currency}");
            $this->line("  Markup Actual: " . ($product->markup * 100) . "%");
            $this->line("  Sale Price Actual: " . ($product->sale_price ?? 'NULL'));
            $this->line("  IVA: " . ($product->iva ? $product->iva->rate . "%" : "0%"));
            
            // Obtener la tasa de IVA
            $ivaRate = null;
            if ($product->iva_id) {
                $iva = \App\Models\Iva::find($product->iva_id);
                $ivaRate = $iva ? $iva->rate / 100 : null;
            }
            
            // Si hay un precio de venta manual, recalcular el markup desde ese precio
            // Si no hay precio manual, recalcular el precio de venta con markup 0
            if ($product->sale_price && $product->sale_price > 0) {
                // Recalcular markup desde el precio de venta actual
                $newMarkup = $pricingService->calculateMarkup(
                    (float) $product->unit_price,
                    $product->currency,
                    (float) $product->sale_price,
                    $product->iva_id
                );
                
                $this->line("  Markup Recalculado: " . ($newMarkup * 100) . "%");
                
                if ($dryRun) {
                    $this->info("  🔧 Se corregiría el markup a: " . ($newMarkup * 100) . "%");
                } else if ($fix) {
                    try {
                        $product->update(['markup' => $newMarkup]);
                        $this->info("  ✅ Markup corregido a: " . ($newMarkup * 100) . "%");
                        $fixed++;
                    } catch (\Exception $e) {
                        $this->error("  ❌ Error: " . $e->getMessage());
                        $errors++;
                    }
                }
            } else {
                // No hay precio manual, recalcular precio de venta con markup 0
                $newSalePrice = $pricingService->calculateSalePrice(
                    (float) $product->unit_price,
                    $product->currency,
                    0.0, // Markup corregido a 0
                    $ivaRate
                );
                
                $this->line("  Sale Price Recalculado: {$newSalePrice}");
                
                if ($dryRun) {
                    $this->info("  🔧 Se corregiría el markup a 0% y el precio de venta a: {$newSalePrice}");
                } else if ($fix) {
                    try {
                        $product->update([
                            'markup' => 0.0,
                            'sale_price' => $newSalePrice
                        ]);
                        $this->info("  ✅ Markup corregido a 0% y precio de venta actualizado");
                        $fixed++;
                    } catch (\Exception $e) {
                        $this->error("  ❌ Error: " . $e->getMessage());
                        $errors++;
                    }
                }
            }
            
            $this->newLine();
        }

        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se guardaron cambios. Ejecuta con --fix para aplicar.');
        } else if ($fix) {
            $this->info("✅ Procesados: {$fixed} productos corregidos");
            if ($errors > 0) {
                $this->error("❌ Errores: {$errors} productos");
            }
        } else {
            $this->warn('Ejecuta con --fix para corregir los markups negativos.');
        }
    }
}


