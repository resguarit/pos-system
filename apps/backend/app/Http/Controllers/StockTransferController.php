<?php

namespace App\Http\Controllers;

use App\Models\StockTransfer;
use App\Interfaces\StockTransferServiceInterface;
use App\Http\Requests\StoreStockTransferRequest;
use App\Http\Requests\UpdateStockTransferRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Exception;

class StockTransferController extends Controller
{
    protected StockTransferServiceInterface $stockTransferService;

    public function __construct(StockTransferServiceInterface $stockTransferService)
    {
        $this->stockTransferService = $stockTransferService;
    }

    /**
     * Get all stock transfers with optional filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $stockTransfers = $this->stockTransferService->getAllStockTransfers($request);
            return response()->json($stockTransfers);
        } catch (Exception $e) {
            Log::error("Error obteniendo transferencias de stock: " . $e->getMessage());
            return response()->json([
                'message' => 'Error obteniendo transferencias de stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single stock transfer by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $stockTransfer = $this->stockTransferService->getStockTransferById($id);
            return response()->json($stockTransfer);
        } catch (Exception $e) {
            Log::error("Error obteniendo transferencia de stock {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Transferencia de stock no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create a new stock transfer
     */
    public function store(StoreStockTransferRequest $request): JsonResponse
    {
        try {
            $stockTransfer = $this->stockTransferService->createStockTransfer($request->validated());
            return response()->json($stockTransfer, 201);
        } catch (Exception $e) {
            Log::error("Error creando transferencia de stock: " . $e->getMessage());
            return response()->json([
                'message' => 'Error creando transferencia de stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Update an existing stock transfer
     */
    public function update(UpdateStockTransferRequest $request, int $id): JsonResponse
    {
        try {
            $stockTransfer = $this->stockTransferService->updateStockTransfer($id, $request->validated());
            return response()->json($stockTransfer);
        } catch (Exception $e) {
            Log::error("Error actualizando transferencia de stock {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error actualizando transferencia de stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Delete a stock transfer
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->stockTransferService->deleteStockTransfer($id);
            return response()->json([
                'message' => 'Transferencia de stock eliminada correctamente'
            ]);
        } catch (Exception $e) {
            Log::error("Error eliminando transferencia de stock {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error eliminando transferencia de stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete a stock transfer (execute the stock movement)
     */
    public function complete(int $id): JsonResponse
    {
        try {
            $stockTransfer = $this->stockTransferService->completeStockTransfer($id);
            return response()->json([
                'message' => 'Transferencia completada exitosamente',
                'transfer' => $stockTransfer
            ]);
        } catch (Exception $e) {
            Log::error('Error completando transferencia de stock: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error completando transferencia',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a stock transfer
     */
    public function cancel(int $id): JsonResponse
    {
        try {
            $stockTransfer = $this->stockTransferService->cancelStockTransfer($id);
            return response()->json([
                'message' => 'Transferencia cancelada correctamente',
                'transfer' => $stockTransfer
            ]);
        } catch (Exception $e) {
            Log::error('Error cancelando transferencia de stock: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error cancelando transferencia',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
