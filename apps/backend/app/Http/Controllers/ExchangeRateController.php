<?php

namespace App\Http\Controllers;

use App\Models\ExchangeRate;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class ExchangeRateController extends Controller
{
    /**
     * Obtener la tasa de cambio actual
     */
    public function getCurrentRate(Request $request): JsonResponse
    {
        $request->validate([
            'from_currency' => 'required|in:USD,ARS',
            'to_currency' => 'required|in:USD,ARS',
        ]);

        try {
            $rate = ExchangeRate::getCurrentRate(
                $request->from_currency,
                $request->to_currency
            );

            if ($rate === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'No exchange rate found for the specified currencies',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'from_currency' => $request->from_currency,
                    'to_currency' => $request->to_currency,
                    'rate' => $rate,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exchange rate',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crear o actualizar una tasa de cambio
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'from_currency' => 'required|in:USD,ARS',
            'to_currency' => 'required|in:USD,ARS',
            'rate' => 'required|numeric|min:0',
            'effective_date' => 'nullable|date',
        ]);

        try {
            // Desactivar tasas anteriores para el mismo par de monedas
            ExchangeRate::where('from_currency', $request->from_currency)
                ->where('to_currency', $request->to_currency)
                ->update(['is_active' => false]);

            // Crear nueva tasa de cambio
            $exchangeRate = ExchangeRate::create([
                'from_currency' => $request->from_currency,
                'to_currency' => $request->to_currency,
                'rate' => $request->rate,
                'effective_date' => $request->effective_date ?? Carbon::now(),
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Exchange rate created successfully',
                'data' => $exchangeRate,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating exchange rate',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener todas las tasas de cambio activas
     */
    public function index(): JsonResponse
    {
        try {
            $rates = ExchangeRate::where('is_active', true)
                ->orderBy('from_currency')
                ->orderBy('to_currency')
                ->orderBy('effective_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $rates,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exchange rates',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Convertir un monto de una moneda a otra
     */
    public function convert(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'from_currency' => 'required|in:USD,ARS',
            'to_currency' => 'required|in:USD,ARS',
        ]);

        try {
            $convertedAmount = ExchangeRate::convert(
                $request->amount,
                $request->from_currency,
                $request->to_currency
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'original_amount' => $request->amount,
                    'from_currency' => $request->from_currency,
                    'to_currency' => $request->to_currency,
                    'converted_amount' => round($convertedAmount, 2),
                    'rate_used' => ExchangeRate::getCurrentRate($request->from_currency, $request->to_currency),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error converting amount',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar la tasa de cambio actual (acepta múltiples formatos)
     */
    public function update(Request $request): JsonResponse
    {
        // Validar ambos formatos posibles
        $request->validate([
            'USD_to_ARS' => 'required_without_all:from_currency,to_currency,rate|numeric|min:0',
            'from_currency' => 'required_without:USD_to_ARS|in:USD,ARS',
            'to_currency' => 'required_without:USD_to_ARS|in:USD,ARS',
            'rate' => 'required_without:USD_to_ARS|numeric|min:0',
        ]);

        try {
            // Determinar el formato usado
            if ($request->has('USD_to_ARS')) {
                // Formato específico USD_to_ARS
                $fromCurrency = 'USD';
                $toCurrency = 'ARS';
                $rate = $request->USD_to_ARS;
            } else {
                // Formato genérico
                $fromCurrency = $request->from_currency;
                $toCurrency = $request->to_currency;
                $rate = $request->rate;
            }

            // Desactivar tasa anterior para el mismo par de monedas
            ExchangeRate::where('from_currency', $fromCurrency)
                ->where('to_currency', $toCurrency)
                ->update(['is_active' => false]);

            // Crear nueva tasa
            $exchangeRate = ExchangeRate::create([
                'from_currency' => $fromCurrency,
                'to_currency' => $toCurrency,
                'rate' => $rate,
                'effective_date' => Carbon::now(),
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Exchange rate updated successfully',
                'data' => [
                    'from_currency' => $fromCurrency,
                    'to_currency' => $toCurrency,
                    'rate' => $rate,
                    'effective_date' => $exchangeRate->effective_date,
                ],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating exchange rate',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar precios de productos en USD cuando cambia la tasa de cambio
     */
    public function updatePricesFromExchangeRate(Request $request): JsonResponse
    {
        $request->validate([
            'new_usd_rate' => 'required|numeric|min:0',
        ]);

        try {
            $newRate = $request->new_usd_rate;
            
            // Buscar productos que tengan currency = 'USD'
            $productsInUSD = Product::where('currency', 'USD')->get();
            
            if ($productsInUSD->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'No products found with USD currency',
                    'data' => [
                        'updated_count' => 0,
                        'new_rate' => $newRate,
                    ],
                ]);
            }

            $updatedCount = 0;
            
            foreach ($productsInUSD as $product) {
                // IMPORTANTE: Mantener markup, iva y unit_price originales
                // Solo recalcular sale_price usando la nueva tasa
                
                // 1. Convertir unit_price de USD a ARS con nueva tasa
                $costInArs = $product->unit_price * $newRate;
                
                // 2. Obtener la tasa de IVA
                $ivaRate = 0;
                if ($product->iva) {
                    $ivaRate = $product->iva->rate / 100;
                }
                
                // 3. Aplicar markup PRIMERO (según lógica del frontend)
                // NOTA: markup ya está en formato decimal (0.0425 = 4.25%)
                $markupMultiplier = 1 + $product->markup;
                $priceWithMarkup = $costInArs * $markupMultiplier;
                
                // 4. Aplicar IVA DESPUÉS
                $finalPrice = $priceWithMarkup * (1 + $ivaRate);
                
                // 5. Redondear igual que en el frontend
                // Para precios < 1000: múltiplos de 10, para >= 1000: múltiplos de 100
                $newSalePrice = $finalPrice < 1000 
                    ? round($finalPrice / 10) * 10
                    : round($finalPrice / 100) * 100;
                
                // Actualizar SOLO el sale_price, mantener markup, iva y unit_price
                $product->update(['sale_price' => $newSalePrice]);
                $updatedCount++;
            }

            return response()->json([
                'success' => true,
                'message' => "Updated prices for {$updatedCount} products",
                'data' => [
                    'updated_count' => $updatedCount,
                    'new_rate' => $newRate,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating product prices',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de productos en USD
     */
    public function getUsdProductsStats(): JsonResponse
    {
        try {
            $productsInUSD = Product::where('currency', 'USD')->where('status', true)->get();
            
            $count = $productsInUSD->count();
            $totalValue = $productsInUSD->sum('sale_price');
            
            return response()->json([
                'success' => true,
                'data' => [
                    'count' => $count,
                    'total_value' => $totalValue,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting USD products stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vista previa del impacto del cambio de tasa en productos USD
     */
    public function getExchangeRateImpactPreview(Request $request): JsonResponse
    {
        $request->validate([
            'new_usd_rate' => 'required|numeric|min:0',
        ]);

        try {
            $newRate = $request->new_usd_rate;
            
            // Obtener productos en USD
            $productsInUSD = Product::where('currency', 'USD')
                ->where('status', true)
                ->with(['iva'])
                ->get();
            
            if ($productsInUSD->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'affected_products' => 0,
                        'preview' => [],
                    ],
                ]);
            }

            $preview = [];
            
            foreach ($productsInUSD as $product) {
                // Usar la misma lógica de cálculo y redondeo
                
                // 1. Convertir unit_price de USD a ARS con nueva tasa
                $costInArs = $product->unit_price * $newRate;
                
                // 2. Obtener la tasa de IVA
                $ivaRate = 0;
                if ($product->iva) {
                    $ivaRate = $product->iva->rate / 100;
                }
                
                // 3. Aplicar markup PRIMERO (según lógica del frontend)
                // NOTA: markup ya está en formato decimal (0.0425 = 4.25%)
                $markupMultiplier = 1 + $product->markup;
                $priceWithMarkup = $costInArs * $markupMultiplier;
                
                // 4. Aplicar IVA DESPUÉS
                $finalPrice = $priceWithMarkup * (1 + $ivaRate);
                
                // 5. Redondear igual que en el frontend
                $newSalePrice = $finalPrice < 1000 
                    ? round($finalPrice / 10) * 10
                    : round($finalPrice / 100) * 100;
                
                $preview[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'current_sale_price' => (float) $product->sale_price,
                    'new_sale_price' => $newSalePrice,
                    'price_difference' => $newSalePrice - $product->sale_price,
                    'percentage_change' => $product->sale_price > 0 ? 
                        (($newSalePrice - $product->sale_price) / $product->sale_price) * 100 : 0
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'affected_products' => count($preview),
                    'new_rate' => $newRate,
                    'preview' => $preview,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating exchange rate impact preview',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
