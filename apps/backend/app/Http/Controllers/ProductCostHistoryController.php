<?php

namespace App\Http\Controllers;

use App\Interfaces\ProductCostHistoryServiceInterface;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ProductCostHistoryController extends Controller
{
    protected ProductCostHistoryServiceInterface $costHistoryService;

    public function __construct(ProductCostHistoryServiceInterface $costHistoryService)
    {
        $this->costHistoryService = $costHistoryService;
    }

    /**
     * Obtiene el historial de costos de un producto específico
     *
     * @param int $productId
     * @param Request $request
     * @return JsonResponse
     */
    public function getProductHistory(int $productId, Request $request): JsonResponse
    {
        try {
            // Validar parámetros de la request
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:1000'
            ]);

            // Verificar que el producto existe
            $product = Product::findOrFail($productId);

            $limit = $validated['limit'] ?? null;
            $history = $this->costHistoryService->getProductCostHistory($productId, $limit);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Historial de costos obtenido correctamente',
                'data' => [
                    'product' => [
                        'id' => $product->id,
                        'description' => $product->description,
                        'code' => $product->code,
                        'current_cost' => (float) $product->unit_price,
                        'currency' => $product->currency ?? 'ARS',
                    ],
                    'history' => $history
                ]
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 422,
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (InvalidArgumentException $e) {
            Log::warning("Argumento inválido al obtener historial de costos para producto {$productId}: " . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Error obteniendo historial de costos para producto {$productId}", [
                'exception' => $e,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener el historial de costos'
            ], 500);
        }
    }

    /**
     * Obtiene el historial de costos de múltiples productos
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getMultipleProductsHistory(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array|min:1|max:100',
                'product_ids.*' => 'required|integer|min:1|exists:products,id',
                'limit' => 'nullable|integer|min:1|max:1000'
            ]);

            $productIds = $validated['product_ids'];
            $limit = $validated['limit'] ?? null;
            $history = $this->costHistoryService->getMultipleProductsCostHistory($productIds, $limit);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Historial de costos obtenido correctamente',
                'data' => $history
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 422,
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (InvalidArgumentException $e) {
            Log::warning("Argumento inválido al obtener historial de costos para múltiples productos: " . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            Log::error("Error obteniendo historial de costos para múltiples productos", [
                'exception' => $e,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener el historial de costos'
            ], 500);
        }
    }

    /**
     * Obtiene el último cambio de costo registrado para un producto
     *
     * @param int $productId
     * @return JsonResponse
     */
    public function getLastCostChange(int $productId): JsonResponse
    {
        try {
            // Verificar que el producto existe
            $product = Product::findOrFail($productId);

            $lastHistory = $this->costHistoryService->getLastCostHistory($productId);

            if (!$lastHistory) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'No se encontró historial de costos para este producto',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Último cambio de costo obtenido correctamente',
                'data' => $lastHistory
            ], 200);
        } catch (InvalidArgumentException $e) {
            Log::warning("Argumento inválido al obtener último cambio de costo para producto {$productId}: " . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Error obteniendo último cambio de costo para producto {$productId}", [
                'exception' => $e,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener el último cambio de costo'
            ], 500);
        }
    }
}
