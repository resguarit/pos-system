<?php

namespace App\Services;

use App\Models\ExchangeRate;
use App\Models\Iva;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para manejo de cálculos de precios siguiendo principios SOLID
 * 
 * Single Responsibility: Solo maneja cálculos de precios
 * Open/Closed: Extensible para nuevos tipos de cálculos
 * Liskov Substitution: Implementa interfaces claras
 * Interface Segregation: Métodos específicos para cada cálculo
 * Dependency Inversion: Depende de abstracciones, no implementaciones concretas
 */
class PricingService
{
    private const DEFAULT_EXCHANGE_RATE = 1200.0;
    private const PRICE_PRECISION = 2;
    private const MARKUP_PRECISION = 4;

    /**
     * Calcula el precio de venta basado en costo, markup e IVA
     * Fórmula: costo * (1 + iva) * (1 + markup)
     * 
     * @param float $unitPrice Precio unitario
     * @param string $currency Moneda del precio unitario
     * @param float $markup Markup como decimal (0.20 = 20%)
     * @param float|null $ivaRate Tasa de IVA como decimal (0.21 = 21%)
     * @return float Precio de venta final redondeado
     */
    public function calculateSalePrice(
        float $unitPrice,
        string $currency,
        float $markup,
        ?float $ivaRate = null
    ): float {
        // 1. Convertir costo a ARS si es necesario
        $costInArs = $this->convertToArs($unitPrice, $currency);
        
        // 2. Aplicar IVA primero
        if ($ivaRate !== null && $ivaRate > 0) {
            $costInArs = $costInArs * (1 + $ivaRate);
        }
        
        // 3. Aplicar markup después
        $priceWithMarkup = $costInArs * (1 + $markup);
        
        // 4. Redondear a múltiplos de 100
        return $this->roundPrice($priceWithMarkup);
    }

    /**
     * Calcula el markup basado en precio de venta y costo
     * 
     * @param float $unitPrice Precio unitario
     * @param string $currency Moneda del precio unitario
     * @param float $salePrice Precio de venta objetivo
     * @param int|null $ivaId ID del IVA aplicado
     * @return float Markup como decimal
     */
    public function calculateMarkup(
        float $unitPrice,
        string $currency,
        float $salePrice,
        ?int $ivaId = null
    ): float {
        // 1. Convertir costo a ARS
        $costInArs = $this->convertToArs($unitPrice, $currency);
        
        // 2. Remover IVA del precio de venta si existe
        $priceWithoutIva = $salePrice;
        if ($ivaId) {
            $ivaRate = $this->getIvaRate($ivaId);
            if ($ivaRate > 0) {
                $priceWithoutIva = $salePrice / (1 + $ivaRate);
            }
        }
        
        // 3. Calcular markup: (precio_sin_iva / costo) - 1
        $markup = ($priceWithoutIva / $costInArs) - 1;
        
        // 4. Redondear a 4 decimales
        return round($markup, self::MARKUP_PRECISION);
    }

    /**
     * Convierte un precio de USD a ARS usando la tasa de cambio actual
     * 
     * @param float $amount Monto en USD
     * @return float Monto en ARS
     */
    public function convertUsdToArs(float $amount): float
    {
        try {
            $rate = ExchangeRate::getCurrentRate('USD', 'ARS');
            if ($rate && $rate > 0) {
                return $amount * $rate;
            }
            
            Log::warning("No exchange rate found for USD to ARS, using fallback rate");
            return $amount * self::DEFAULT_EXCHANGE_RATE;
            
        } catch (\Exception $e) {
            Log::warning("Exchange rate service error: " . $e->getMessage() . ", using fallback rate");
            return $amount * self::DEFAULT_EXCHANGE_RATE;
        }
    }

    /**
     * Convierte cualquier moneda a ARS
     * 
     * @param float $amount Monto a convertir
     * @param string $currency Moneda origen
     * @return float Monto en ARS
     */
    private function convertToArs(float $amount, string $currency): float
    {
        if ($currency === 'USD') {
            return $this->convertUsdToArs($amount);
        }
        
        return $amount; // Ya está en ARS
    }

    /**
     * Obtiene la tasa de IVA por ID
     * 
     * @param int $ivaId ID del IVA
     * @return float Tasa como decimal (0.21 = 21%)
     */
    private function getIvaRate(int $ivaId): float
    {
        try {
            $iva = Iva::find($ivaId);
            if ($iva && $iva->rate > 0) {
                return $iva->rate / 100; // Convertir porcentaje a decimal
            }
        } catch (\Exception $e) {
            Log::warning("Error getting IVA rate for ID {$ivaId}: " . $e->getMessage());
        }
        
        return 0.0;
    }

    /**
     * Redondea un precio de manera inteligente
     * Para precios pequeños (< 1000), redondea a múltiplos de 10
     * Para precios grandes (>= 1000), redondea a múltiplos de 100
     * 
     * @param float $price Precio a redondear
     * @return float Precio redondeado
     */
    private function roundPrice(float $price): float
    {
        // Asegurar que no sea negativo
        $price = max(0, $price);
        
        if ($price < 1000) {
            // Para precios pequeños, redondear a múltiplos de 10
            return round($price / 10) * 10;
        } else {
            // Para precios grandes, redondear a múltiplos de 100
            return round($price / 100) * 100;
        }
    }

    /**
     * Valida que los parámetros de precio sean válidos
     * 
     * @param float $unitPrice Precio unitario
     * @param float $markup Markup
     * @param float|null $salePrice Precio de venta (opcional)
     * @return bool True si los parámetros son válidos
     */
    public function validatePricingParameters(
        float $unitPrice,
        float $markup,
        ?float $salePrice = null
    ): bool {
        // Precio unitario debe ser positivo
        if ($unitPrice <= 0) {
            return false;
        }
        
        // Markup debe ser >= -1 (no puede ser menor a -100%)
        if ($markup < -1) {
            return false;
        }
        
        // Si se proporciona precio de venta, debe ser positivo
        if ($salePrice !== null && $salePrice <= 0) {
            return false;
        }
        
        return true;
    }

    /**
     * Obtiene el precio unitario en ARS
     * 
     * @param float $unitPrice Precio unitario
     * @param string $currency Moneda del precio
     * @return float Precio unitario en ARS
     */
    public function getUnitPriceInArs(float $unitPrice, string $currency): float
    {
        return $this->convertToArs($unitPrice, $currency);
    }

    /**
     * Formatea un precio para mostrar en la UI
     * 
     * @param float $price Precio a formatear
     * @param string $currency Moneda (opcional)
     * @return string Precio formateado
     */
    public function formatPrice(float $price, string $currency = 'ARS'): string
    {
        $symbol = $currency === 'USD' ? '$' : '$';
        return $symbol . number_format($price, self::PRICE_PRECISION, ',', '.');
    }

    /**
     * Formatea un markup para mostrar en la UI
     * 
     * @param float $markup Markup como decimal
     * @return string Markup formateado como porcentaje
     */
    public function formatMarkup(float $markup): string
    {
        return number_format($markup * 100, 2) . '%';
    }
}
