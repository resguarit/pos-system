<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Interfaces\CurrentAccountServiceInterface;
use App\Http\Resources\CurrentAccountMovementResource;
use App\Http\Resources\CurrentAccountResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Exception;

class CurrentAccountController extends Controller
{
    protected CurrentAccountServiceInterface $currentAccountService;

    public function __construct(CurrentAccountServiceInterface $currentAccountService)
    {
        $this->currentAccountService = $currentAccountService;
    }

    /**
     * Obtener todas las cuentas corrientes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $accounts = $this->currentAccountService->getAccountsPaginated($request);

            // Transformar los resultados usando el Resource para incluir campos calculados
            $transformedData = $accounts->through(function ($account) {
                return new CurrentAccountResource($account);
            });

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuentas corrientes obtenidas correctamente',
                'data' => $transformedData
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuentas corrientes: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Crear una nueva cuenta corriente
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $account = $this->currentAccountService->createAccount($request->all());

            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Cuenta corriente creada exitosamente',
                'data' => $account->load(['customer.person'])
            ], 201);
        } catch (Exception $e) {
            Log::error('Error al crear cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Obtener cuenta corriente por ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $account = $this->currentAccountService->getAccountById($id);

            if (!$account) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Cuenta corriente no encontrada'
                ], 404);
            }

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuenta corriente obtenida correctamente',
                'data' => new CurrentAccountResource($account)
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Actualizar cuenta corriente
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $account = $this->currentAccountService->updateAccount($id, $request->all());

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuenta corriente actualizada exitosamente',
                'data' => $account
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al actualizar cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Eliminar cuenta corriente
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->currentAccountService->deleteAccount($id);

            if ($deleted) {
                return response()->json([
                    'status' => 200,
                    'success' => true,
                    'message' => 'Cuenta corriente eliminada exitosamente'
                ], 200);
            }

            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => 'No se pudo eliminar la cuenta corriente'
            ], 400);
        } catch (Exception $e) {
            Log::error('Error al eliminar cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Obtener cuenta corriente por cliente
     */
    public function getByCustomer(int $customerId): JsonResponse
    {
        try {
            $account = $this->currentAccountService->getAccountByCustomer($customerId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => $account ? 'Cuenta corriente obtenida' : 'No se encontró cuenta corriente para este cliente',
                'data' => $account ? new CurrentAccountResource($account) : null
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuenta corriente por cliente: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Suspender cuenta corriente
     */
    public function suspend(Request $request, int $id): JsonResponse
    {
        try {
            $reason = $request->input('reason');
            $account = $this->currentAccountService->suspendAccount($id, $reason);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuenta corriente suspendida exitosamente',
                'data' => $account
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al suspender cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Reactivar cuenta corriente
     */
    public function reactivate(int $id): JsonResponse
    {
        try {
            $account = $this->currentAccountService->reactivateAccount($id);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuenta corriente reactivada exitosamente',
                'data' => $account
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al reactivar cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Cerrar cuenta corriente
     */
    public function close(Request $request, int $id): JsonResponse
    {
        try {
            $reason = $request->input('reason');
            $account = $this->currentAccountService->closeAccount($id, $reason);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuenta corriente cerrada exitosamente',
                'data' => $account
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al cerrar cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }


    /**
     * Obtener movimientos de cuenta corriente
     */
    public function movements(Request $request, int $accountId): JsonResponse
    {
        try {
            $movements = $this->currentAccountService->getAccountMovements($accountId, $request);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Movimientos obtenidos correctamente',
                'data' => [
                    'current_page' => $movements->currentPage(),
                    'data' => CurrentAccountMovementResource::collection($movements->items()),
                    'first_page_url' => $movements->url(1),
                    'from' => $movements->firstItem(),
                    'last_page' => $movements->lastPage(),
                    'last_page_url' => $movements->url($movements->lastPage()),
                    'links' => $movements->linkCollection()->toArray(),
                    'next_page_url' => $movements->nextPageUrl(),
                    'path' => $movements->path(),
                    'per_page' => $movements->perPage(),
                    'prev_page_url' => $movements->previousPageUrl(),
                    'to' => $movements->lastItem(),
                    'total' => $movements->total(),
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error al obtener movimientos: ' . $e->getMessage(), [
                'account_id' => $accountId,
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }


    /**
     * Obtener balance de cuenta corriente
     */
    public function balance(int $accountId): JsonResponse
    {
        try {
            $balance = $this->currentAccountService->getAccountBalance($accountId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Balance obtenido correctamente',
                'data' => ['balance' => $balance]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener balance: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener filtros disponibles para movimientos de una cuenta
     */
    public function movementFilters(int $accountId): JsonResponse
    {
        try {
            $filters = $this->currentAccountService->getMovementFilters($accountId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Filtros obtenidos correctamente',
                'data' => $filters
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener filtros: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Procesar pago en cuenta corriente
     */
    public function processPayment(Request $request, int $accountId): JsonResponse
    {
        try {
            $movement = $this->currentAccountService->processPayment($accountId, $request->all());

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Pago procesado exitosamente',
                'data' => $movement
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al procesar pago: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Procesar compra a crédito
     */
    public function processCreditPurchase(Request $request, int $accountId): JsonResponse
    {
        try {
            $movement = $this->currentAccountService->processCreditPurchase($accountId, $request->all());

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Compra a crédito procesada exitosamente',
                'data' => $movement
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al procesar compra a crédito: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Crear movimiento manual
     */
    public function createMovement(Request $request): JsonResponse
    {
        try {
            $movement = $this->currentAccountService->createMovement($request->all());

            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Movimiento creado exitosamente',
                'data' => $movement
            ], 201);
        } catch (Exception $e) {
            Log::error('Error al crear movimiento: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Verificar crédito disponible
     */
    public function checkAvailableCredit(Request $request, int $accountId): JsonResponse
    {
        try {
            $amount = $request->input('amount', 0);
            $available = $this->currentAccountService->checkAvailableCredit($accountId, $amount);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Verificación de crédito completada',
                'data' => [
                    'amount' => $amount,
                    'available' => $available
                ]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al verificar crédito: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de cuenta corriente
     */
    public function statistics(int $accountId): JsonResponse
    {
        try {
            $statistics = $this->currentAccountService->getAccountStatistics($accountId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Estadísticas obtenidas correctamente',
                'data' => $statistics
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener estadísticas: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener estadísticas generales
     */
    public function generalStatistics(): JsonResponse
    {
        try {
            $statistics = $this->currentAccountService->getGeneralStatistics();

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Estadísticas generales obtenidas correctamente',
                'data' => $statistics
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener estadísticas generales: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener cuentas por estado
     */
    public function getByStatus(string $status): JsonResponse
    {
        try {
            $accounts = $this->currentAccountService->getAccountsByStatus($status);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => "Cuentas corrientes con estado '{$status}' obtenidas correctamente",
                'data' => $accounts
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuentas por estado: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener cuentas con límite alcanzado
     */
    public function getAtCreditLimit(): JsonResponse
    {
        try {
            $accounts = $this->currentAccountService->getAccountsAtCreditLimit();

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuentas corrientes con límite alcanzado obtenidas correctamente',
                'data' => $accounts
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuentas con límite alcanzado: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener cuentas sobregiradas
     */
    public function getOverdrawn(): JsonResponse
    {
        try {
            $accounts = $this->currentAccountService->getOverdrawnAccounts();

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Cuentas corrientes sobregiradas obtenidas correctamente',
                'data' => $accounts
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener cuentas sobregiradas: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Actualizar límite de crédito
     */
    public function updateCreditLimit(Request $request, int $accountId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'credit_limit' => 'required|numeric|min:0',
                'reason' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 422,
                    'success' => false,
                    'message' => 'Datos de validación incorrectos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $account = $this->currentAccountService->updateCreditLimit(
                $accountId,
                $request->input('credit_limit'),
                $request->input('reason')
            );

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Límite de crédito actualizado exitosamente',
                'data' => $account
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al actualizar límite de crédito: ' . $e->getMessage());
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Exportar movimientos
     */
    public function exportMovements(Request $request, int $accountId): JsonResponse
    {
        try {
            $csv = $this->currentAccountService->exportMovements($accountId, $request);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Movimientos exportados correctamente',
                'data' => [
                    'csv' => $csv,
                    'filename' => "movimientos_cuenta_{$accountId}_" . now()->format('Y-m-d') . '.csv'
                ]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al exportar movimientos: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Generar reporte de cuentas corrientes
     */
    public function generateReport(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['status', 'from_date', 'to_date']);
            $report = $this->currentAccountService->generateAccountsReport($filters);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Reporte generado correctamente',
                'data' => $report
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al generar reporte: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener ventas pendientes de pago de una cuenta corriente
     */
    public function pendingSales(int $accountId): JsonResponse
    {
        try {
            $account = \App\Models\CurrentAccount::with('customer')->findOrFail($accountId);

            // Incluir todas las ventas EXCEPTO rechazadas
            // Las ventas anuladas que tengan saldo pendiente también se muestran
            $pendingSales = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                ->validForDebt()
                ->pendingDebt()
                ->withSum([
                    'currentAccountMovements as surcharge_total' => function ($query) {
                        $query->whereHas('movementType', function ($q) {
                            $q->where('name', 'Recargo');
                        });
                    }
                ], 'amount')
                ->orderBy('created_at', 'desc')
                ->get()
                ->filter(function ($sale) {
                    // Solo incluir ventas que realmente tengan monto pendiente
                    return $sale->pending_amount > 0;
                })
                ->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'receipt_number' => $sale->receipt_number,
                        'date' => $sale->created_at ? $sale->created_at->format('Y-m-d') : 'N/A',
                        'total' => (float) ($sale->total ?? 0) + (float) ($sale->surcharge_total ?? 0),
                        'paid_amount' => (float) ($sale->paid_amount ?? 0),
                        'pending_amount' => (float) $sale->pending_amount, // Ya incluye recargo por el accessor
                        'payment_status' => $sale->payment_status ?? 'pending',
                        'branch_id' => $sale->branch_id,
                        'original_total' => (float) ($sale->total ?? 0),
                        'surcharge_amount' => (float) ($sale->surcharge_total ?? 0),
                    ];
                })
                ->values(); // Re-indexar el array después del filter

            return response()->json([
                'status' => 200,
                'success' => true,
                'data' => $pendingSales
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al obtener ventas pendientes: ' . $e->getMessage(), [
                'account_id' => $accountId,
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener ventas pendientes'
            ], 500);
        }
    }

    /**
     * Vista previa de actualización de precio para una venta individual
     */
    public function previewSalePriceUpdate(int $accountId, int $saleId): JsonResponse
    {
        try {
            $updateService = new \App\Services\UpdateSalePricesService();
            $preview = $updateService->previewSalePriceUpdate($saleId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Vista previa generada correctamente',
                'data' => $preview
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al generar vista previa de actualización de precio: ' . $e->getMessage(), [
                'account_id' => $accountId,
                'sale_id' => $saleId,
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Aplicar actualización de precio a una venta individual
     */
    public function updateSalePrice(int $accountId, int $saleId): JsonResponse
    {
        try {
            $updateService = new \App\Services\UpdateSalePricesService();
            $result = $updateService->updateSalePrice($saleId);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => $result['message'],
                'data' => $result
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al actualizar precio de venta: ' . $e->getMessage(), [
                'account_id' => $accountId,
                'sale_id' => $saleId,
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Vista previa de actualización masiva de precios (todas las ventas pendientes de un cliente)
     */
    public function previewBatchPriceUpdate(int $accountId): JsonResponse
    {
        try {
            $account = \App\Models\CurrentAccount::findOrFail($accountId);

            // Get all pending sale IDs for this customer
            $pendingSaleIds = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                ->validForDebt()
                ->pendingDebt()
                ->pluck('id')
                ->toArray();

            if (empty($pendingSaleIds)) {
                return response()->json([
                    'status' => 200,
                    'success' => true,
                    'message' => 'No hay ventas pendientes para actualizar',
                    'data' => [
                        'sales' => [],
                        'total_difference' => 0,
                        'count' => 0
                    ]
                ], 200);
            }

            $updateService = new \App\Services\UpdateSalePricesService();
            $preview = $updateService->previewBatchPriceUpdate($pendingSaleIds);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Vista previa masiva generada correctamente',
                'data' => $preview
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al generar vista previa masiva: ' . $e->getMessage(), [
                'account_id' => $accountId,
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al generar vista previa masiva'
            ], 500);
        }
    }

    /**
     * Vista previa global de actualización masiva (todas las ventas pendientes, todos los clientes)
     */
    public function previewGlobalBatchPriceUpdate(): JsonResponse
    {
        try {
            $updateService = new \App\Services\UpdateSalePricesService();
            $preview = $updateService->previewBatchPriceUpdate(null);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Vista previa global generada correctamente',
                'data' => $preview
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al generar vista previa global: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al generar vista previa global'
            ], 500);
        }
    }

    /**
     * Aplicar actualización masiva de precios (array de sale_ids)
     */
    public function batchUpdatePrices(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'sale_ids' => 'required|array|min:1',
                'sale_ids.*' => 'required|integer|exists:sales_header,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 422,
                    'success' => false,
                    'message' => 'Datos de validación incorrectos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updateService = new \App\Services\UpdateSalePricesService();
            $result = $updateService->updateBatchPrices($request->input('sale_ids'));

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => $result['message'],
                'data' => $result
            ], 200);
        } catch (Exception $e) {
            Log::error('Error al actualizar precios masivamente: ' . $e->getMessage(), [
                'sale_ids' => $request->input('sale_ids'),
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
