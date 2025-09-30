<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('sale_price', 10, 2)->nullable()->after('markup');
        });

        // Recalcular precios de venta para productos existentes
        $this->recalculateExistingSalePrices();
    }

    /**
     * Recalcular precios de venta para productos existentes
     */
    private function recalculateExistingSalePrices(): void
    {
        // Obtener todos los productos existentes
        $products = \App\Models\Product::with('iva')->get();
        
        foreach ($products as $product) {
            // Calcular el precio de venta usando la misma lógica del modelo
            $unitPrice = $product->unit_price ?? 0;
            $markup = $product->markup ?? 0;
            $currency = $product->currency ?? 'ARS';
            
            // Convertir a ARS si es necesario
            $costInArs = $currency === 'USD' 
                ? $this->convertUsdToArs($unitPrice)
                : $unitPrice;
            
            // Aplicar markup
            $priceWithMarkup = $costInArs * (1 + $markup);
            
            // Aplicar IVA si existe
            if ($product->iva && $product->iva->rate > 0) {
                $priceWithMarkup = $priceWithMarkup * (1 + ($product->iva->rate / 100));
            }
            
            // Redondear hacia arriba para mantener precios redondos
            $roundedPrice = $this->roundToReasonablePrice($priceWithMarkup);
            $finalPrice = round($roundedPrice, 2);
            
            // Actualizar el producto
            $product->update(['sale_price' => $finalPrice]);
        }
    }

    /**
     * Convertir USD a ARS usando tasa de cambio
     */
    private function convertUsdToArs($amount)
    {
        try {
            $rate = \App\Models\ExchangeRate::getCurrentRate('USD', 'ARS');
            if ($rate) {
                return $amount * $rate;
            }
            
            // Fallback: usar tasa fija de 1200
            return $amount * 1200;
            
        } catch (\Exception $e) {
            // Fallback: usar tasa fija de 1200 si hay error
            return $amount * 1200;
        }
    }

    /**
     * Redondear precio a valores más razonables para el usuario
     */
    private function roundToReasonablePrice($price)
    {
        // Si el precio es muy alto (> 1000), redondear a múltiplos de 100
        if ($price > 1000) {
            return ceil($price / 100) * 100;
        }
        
        // Si el precio es alto (> 100), redondear a múltiplos de 10
        if ($price > 100) {
            return ceil($price / 10) * 10;
        }
        
        // Si el precio es medio (> 10), redondear a múltiplos de 1
        if ($price > 10) {
            return ceil($price);
        }
        
        // Para precios bajos, mantener decimales
        return $price;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sale_price');
        });
    }
};
