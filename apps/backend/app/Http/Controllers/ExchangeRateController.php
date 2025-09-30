<?php

namespace App\Http\Controllers;

use App\Models\ExchangeRate;
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
}
