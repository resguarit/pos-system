<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Support\Facades\DB;

class FixInvalidPricing extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:fix-invalid-pricing 
                            {--dry-run : Solo mostrar qué se haría sin ejecutar}
                            {--fix : Corregir los precios encontrados}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Identifica y corrige productos con precios de venta o markup inválidos';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $pricingService = app(PricingService::class);
        $dryRun = $this->option('dry-run');
        $fix = $this->option('fix');

        $this->info('🔍 Buscando productos con precios inválidos...');
        $this->newLine();

        // Buscar productos con markup sospechoso (incluyendo markups negativos)
        $suspiciousProducts = Product::where(function($q) {
                $q->where('markup', '>', 1)  // markup > 100%
                   ->orWhere('markup', '<', 0)  // markup negativo (cualquier valor < 0)
                   ->orWhere(function($subQ) {
                       $subQ->whereNull('sale_price')
                            ->orWhere('sale_price', '<=', 0);
                   });
            })
            ->with(['iva'])
            ->get();

        if ($suspiciousProducts->isEmpty()) {
            $this->info('✅ No se encontraron productos con precios sospechosos.');
            return;
        }

        $this->warn("⚠️  Se encontraron {$suspiciousProducts->count()} productos con precios sospechosos:");
        $this->newLine();

        $fixed = 0;
        $errors = 0;

        foreach ($suspiciousProducts as $product) {
            $this->line("ID: {$product->id} | Código: {$product->code}");
            $this->line("  Descripción: {$product->description}");
            $this->line("  Unit Price: {$product->unit_price} {$product->currency}");
            $this->line("  Markup: " . ($product->markup * 100) . "%");
            $this->line("  IVA: " . ($product->iva ? $product->iva->rate . "%" : "0%"));
            $this->line("  Sale Price Actual: " . ($product->sale_price ?? 'NULL'));
            
            // Calcular precio correcto
            $ivaRate = null;
            if ($product->iva_id) {
                $iva = \App\Models\Iva::find($product->iva_id);
                $ivaRate = $iva ? $iva->rate / 100 : null;
            }
            
            $expectedSalePrice = $pricingService->calculateSalePrice(
                (float) $product->unit_price,
                $product->currency,
                (float) $product->markup,
                $ivaRate
            );
            
            $this->line("  Sale Price Esperado: {$expectedSalePrice}");
            
            $difference = abs(($product->sale_price ?? 0) - $expectedSalePrice);
            if ($difference > 1000) {
                $this->error("  ⚠️  DIFERENCIA SIGNIFICATIVA: {$difference}");
            }
            
            $this->newLine();

            if ($fix && !$dryRun) {
                try {
                    $updateData = ['sale_price' => $expectedSalePrice];
                    
                    // Si el markup es negativo, corregirlo a 0
                    if ($product->markup < 0) {
                        $updateData['markup'] = 0.0;
                        $this->line("  🔧 Markup negativo detectado, se corregirá a 0%");
                        
                        // Recalcular el precio de venta con markup 0
                        $updateData['sale_price'] = $pricingService->calculateSalePrice(
                            (float) $product->unit_price,
                            $product->currency,
                            0.0, // Markup corregido a 0
                            $ivaRate
                        );
                    }
                    
                    $product->update($updateData);
                    $this->info("  ✅ Actualizado");
                    $fixed++;
                } catch (\Exception $e) {
                    $this->error("  ❌ Error: " . $e->getMessage());
                    $errors++;
                }
            }
        }

        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se guardaron cambios. Ejecuta con --fix para aplicar.');
        } else if ($fix) {
            $this->info("✅ Procesados: {$fixed} productos corregidos");
            if ($errors > 0) {
                $this->error("❌ Errores: {$errors} productos");
            }
        } else {
            $this->warn('Ejecuta con --fix para corregir los precios.');
        }
    }
}

