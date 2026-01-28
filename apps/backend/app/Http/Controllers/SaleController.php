<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Interfaces\SaleServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Exception;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use App\Constants\AfipConstants;
use App\Models\Category;
use App\Models\ReceiptType;

class SaleController extends Controller
{
    protected SaleServiceInterface $saleService;

    public function __construct(SaleServiceInterface $saleService)
    {
        $this->saleService = $saleService;
    }

    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $sales = $this->saleService->getAllSales($request);
        return response()->json(['data' => $sales], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'sometimes|date',
            'receipt_type_id' => 'required|integer|exists:receipt_type,id',
            'branch_id' => 'required|integer|exists:branches,id',
            'customer_id' => 'nullable|integer|exists:customers,id',
            'sale_fiscal_condition_id' => 'nullable|integer|exists:fiscal_conditions,id',
            'sale_document_type_id' => 'nullable|integer|exists:document_types,id',
            'sale_document_number' => 'nullable|string|max:255',
            'iibb' => 'nullable|numeric|min:0',
            'internal_tax' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:percent,amount',
            'discount_value' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:percent,amount',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'converted_from_budget_id' => 'nullable|integer|exists:sales_header,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $validatedData = $validator->validated();

            // --- INICIO DE LA MODIFICACIÓN ---

            // 1. Buscamos el tipo de comprobante.
            $receiptType = ReceiptType::find($validatedData['receipt_type_id']);

            // 2. Verificamos si NO es un presupuesto para asignar la caja.
            //    El middleware 'cash.open' ya nos ha proporcionado 'current_cash_register' en el request.
            if ($receiptType && $receiptType->name !== 'Presupuesto') {
                $currentCashRegister = $request->get('current_cash_register');
                if ($currentCashRegister) {
                    $validatedData['current_cash_register_id'] = $currentCashRegister->id;
                }
            } else {
                // Si es un presupuesto, nos aseguramos de no pasar el ID de la caja.
                $validatedData['current_cash_register_id'] = null;
            }

            // --- FIN DE LA MODIFICACIÓN ---

            $sale = $this->saleService->createSale($validatedData);

            return response()->json([
                'success' => true,
                'data' => $sale,
                'message' => 'Venta creada exitosamente.'
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la venta: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        $sale = $this->saleService->getSaleById($id);
        if (!$sale) {
            return response()->json(['message' => 'Venta no encontrada.'], 404);
        }

        $saleData = $sale->toArray();
        $saleData['converted_to_sale_receipt'] = $sale->convertedToSale ? $sale->convertedToSale->receipt_number : null;
        $saleData['converted_from_budget_receipt'] = $sale->convertedFromBudget ? $sale->convertedFromBudget->receipt_number : null;

        if ($sale->user) {
            if ($sale->user->person) {
                $saleData['seller_name'] = trim($sale->user->person->first_name . ' ' . $sale->user->person->last_name);
            } else {
                $saleData['seller_name'] = $sale->user->username ?? 'N/A';
            }
            $saleData['seller_id'] = $sale->user->id;
        } else {
            $saleData['seller_name'] = 'N/A';
            $saleData['seller_id'] = null;
        }

        return response()->json(['data' => $saleData], 200);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $sale = $this->saleService->getSaleById($id);
        if (!$sale) {
            return response()->json(['message' => 'Venta no encontrada.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'sometimes|required|date',
            'receipt_type_id' => 'sometimes|required|integer|exists:receipt_type,id',
            'branch_id' => 'sometimes|required|integer|exists:branches,id',
            'receipt_number' => 'sometimes|required|string|max:255',
            'customer_id' => 'nullable|integer|exists:customers,id',
            'sale_fiscal_condition_id' => 'nullable|integer|exists:fiscal_conditions,id',
            'sale_document_type_id' => 'nullable|integer|exists:document_types,id',
            'sale_document_number' => 'nullable|string|max:255',
            'subtotal' => 'sometimes|required|numeric|min:0',
            'iva_id' => 'sometimes|required|integer|exists:ivas,id',
            'iibb' => 'nullable|numeric|min:0',
            'internal_tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'total' => 'sometimes|required|numeric|min:0',
            'cae' => 'nullable|string|max:255',
            'cae_expiration_date' => 'nullable|date',
            'service_from_date' => 'nullable|date',
            'service_to_date' => 'nullable|date|after_or_equal:service_from_date',
            'service_due_date' => 'nullable|date',
            'user_id' => 'sometimes|required|integer|exists:users,id',

        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updatedSale = $this->saleService->updateSale($id, $validator->validated());
        return response()->json(['data' => $updatedSale, 'message' => 'Venta actualizada exitosamente.'], 200);
    }

    public function destroy(int $id): JsonResponse
    {
        $deleted = $this->saleService->deleteSale($id);
        if (!$deleted) {
            return response()->json(['message' => 'Venta no encontrada o no se pudo eliminar.'], 404);
        }
        return response()->json(['message' => 'Venta eliminada exitosamente.'], 200);
    }

    public function summary(Request $request): JsonResponse
    {
        $from = $request->input('from_date') ?? $request->input('from');
        $to = $request->input('to_date') ?? $request->input('to');
        $branchId = $request->input('branch_id');

        $validator = Validator::make([
            'branch_id' => $branchId,
            'from' => $from,
            'to' => $to,
        ], [
            'branch_id' => 'required|integer|exists:branches,id',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $request->merge(['from_date' => $from, 'to_date' => $to]);
        $summary = $this->saleService->getSalesSummary($request);
        return response()->json($summary);
    }

    public function downloadPdf(Request $request, $id)
    {
        try {
            // Debug: Log the incoming request
            \Illuminate\Support\Facades\Log::info('SaleController downloadPdf called', [
                'sale_id' => $id,
                'query_format' => $request->query('format'),
                'all_query' => $request->query(),
                'url' => $request->fullUrl()
            ]);

            $sale = \App\Models\SaleHeader::with([
                'items.product.iva',
                'branch',
                'customer.person',
                'receiptType',
                'saleIvas.iva',
                'saleFiscalCondition',
            ])->findOrFail($id);

            // Obtener formato de la query string (default: standard)
            $format = $request->query('format', 'standard');

            return $this->saleService->downloadPdf($id, $format);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error generando PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function salesHistoryByBranch(Request $request, int $branchId): JsonResponse
    {
        $salesHistory = $this->saleService->getSalesHistoryByBranch($branchId, $request);
        if (empty($salesHistory)) {
            return response()->json(['message' => 'No sales history found for this branch.'], 404);
        }
        return response()->json(['data' => $salesHistory], 200);
    }

    public function summaryAllBranches(Request $request): JsonResponse
    {
        $from = $request->input('from_date') ?? $request->input('from');
        $to = $request->input('to_date') ?? $request->input('to');
        $validator = Validator::make(['from' => $from, 'to' => $to], [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $summaries = $this->saleService->getSalesSummaryAllBranches($request);
        return response()->json($summaries);
    }

    public function indexGlobal(Request $request)
    {
        try {
            $sales = $this->saleService->getAllSalesGlobal($request);
            return response()->json($sales);
        } catch (QueryException $e) {
            return response()->json(['error' => 'Error de base de datos: ' . $e->getMessage()], 500);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function summaryGlobal(Request $request)
    {
        try {
            $summary = $this->saleService->getSalesSummaryGlobal($request);
            return response()->json($summary);
        } catch (QueryException $e) {
            return response()->json(['error' => 'Error de base de datos: ' . $e->getMessage()], 500);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function historyGlobal(Request $request)
    {
        try {
            $history = $this->saleService->getSalesHistoryGlobal($request);
            return response()->json($history);
        } catch (QueryException $e) {
            return response()->json(['error' => 'Error de base de datos: ' . $e->getMessage()], 500);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Autoriza una venta con AFIP
     * 
     * @param int $id ID de la venta
     * @return JsonResponse Respuesta con los datos de autorización
     */
    public function authorizeWithAfip(int $id): JsonResponse
    {
        try {
            $sale = \App\Models\SaleHeader::with([
                'receiptType',
                'customer.person',
            ])->findOrFail($id);

            if ($sale->receiptType && AfipConstants::isInternalOnlyReceipt($sale->receiptType->afip_code ?? null)) {
                $message = AfipConstants::isFacturaX($sale->receiptType->afip_code ?? null)
                    ? 'La Factura X es solo de uso interno y no se autoriza con AFIP'
                    : 'Los presupuestos no requieren autorización AFIP';
                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 400);
            }

            // Validar que no tenga CAE ya
            if ($sale->cae) {
                return response()->json([
                    'success' => false,
                    'message' => 'La venta ya está autorizada con CAE: ' . $sale->cae,
                    'data' => [
                        'cae' => $sale->cae,
                        'cae_expiration_date' => $sale->cae_expiration_date?->format('Y-m-d'),
                    ],
                ], 400);
            }

            // Autorizar con AFIP
            $result = $this->saleService->authorizeWithAfip($sale);

            return response()->json([
                'success' => true,
                'data' => [
                    'cae' => $result['cae'] ?? null,
                    'cae_expiration_date' => $result['cae_expiration_date'] ?? null,
                    'invoice_number' => $result['invoice_number'] ?? null,
                    'point_of_sale' => $result['point_of_sale'] ?? null,
                    'invoice_type' => $result['invoice_type'] ?? null,
                ],
                'message' => 'Venta autorizada con AFIP exitosamente'
            ]);

        } catch (\Exception $e) {
            // Extraer código AFIP si existe
            $afipCode = null;
            if (method_exists($e, 'getPrevious') && $e->getPrevious()) {
                $previous = $e->getPrevious();
                if (method_exists($previous, 'getAfipCode')) {
                    $afipCode = $previous->getAfipCode();
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al autorizar con AFIP: ' . $e->getMessage(),
                'afip_code' => $afipCode,
            ], 500);
        }
    }

    /**
     * Convertir un presupuesto a venta
     * 
     * @param Request $request
     * @param int $id ID del presupuesto
     * @return JsonResponse
     */
    public function convertBudget(Request $request, int $id): JsonResponse
    {
        try {
            $userId = auth()->id();

            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Validaciones mejoradas con mensajes personalizados
            $validator = Validator::make($request->all(), [
                'receipt_type_id' => 'required|integer|exists:receipt_type,id',
                'cash_register_id' => 'nullable|integer|exists:cash_registers,id',
                'payment_method_id' => 'required|integer|exists:payment_methods,id'
            ], [
                'receipt_type_id.required' => 'El tipo de comprobante es obligatorio',
                'receipt_type_id.exists' => 'El tipo de comprobante seleccionado no existe',
                'payment_method_id.required' => 'El método de pago es obligatorio',
                'payment_method_id.exists' => 'El método de pago seleccionado no existe',
                'cash_register_id.exists' => 'La caja registradora especificada no existe'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de conversión inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $receiptTypeId = $request->input('receipt_type_id');
            $cashRegisterId = $request->input('cash_register_id');
            $paymentMethodId = $request->input('payment_method_id');

            // Validación adicional: verificar que el presupuesto existe y tiene items
            $budget = \App\Models\SaleHeader::find($id);
            if (!$budget) {
                return response()->json([
                    'success' => false,
                    'message' => 'El presupuesto no existe'
                ], 404);
            }

            if ($budget->items()->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'El presupuesto no tiene productos. No se puede convertir a venta.'
                ], 422);
            }

            if ($budget->total <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'El presupuesto tiene un total inválido. No se puede convertir a venta.'
                ], 422);
            }

            $sale = $this->saleService->convertBudgetToSale($id, $receiptTypeId, $userId, $cashRegisterId, $paymentMethodId);

            return response()->json([
                'success' => true,
                'data' => $sale,
                'message' => 'Presupuesto convertido a venta exitosamente'
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error converting budget to sale', [
                'budget_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al convertir el presupuesto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar/Cancelar un presupuesto
     * 
     * @param int $id ID del presupuesto
     * @return JsonResponse
     */
    public function deleteBudget(int $id): JsonResponse
    {
        try {
            $userId = auth()->id();

            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $this->saleService->deleteBudget($id, $userId);

            return response()->json([
                'success' => true,
                'message' => 'Presupuesto eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Listar presupuestos
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function budgets(Request $request): JsonResponse
    {
        try {
            $paginated = $this->saleService->getBudgets($request);

            return response()->json([
                'success' => true,
                'data' => $paginated->items(),
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aprobar un presupuesto
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function approve(int $id): JsonResponse
    {
        try {
            $budget = $this->saleService->approveBudget($id);

            return response()->json([
                'success' => true,
                'message' => 'Presupuesto aprobado exitosamente',
                'data' => $budget
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get sold products aggregated for stock transfer
     * Groups products sold in a date range by product_id and includes available stock
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getSoldProductsForTransfer(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'source_branch_id' => 'required|integer|exists:branches,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'category_id' => 'nullable|integer|exists:categories,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $sourceBranchId = $request->input('source_branch_id');
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $categoryId = $request->input('category_id');

            // Query sold items grouped by product
            $query = DB::table('sale_items')
                ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->leftJoin('stocks', function ($join) use ($sourceBranchId) {
                    $join->on('sale_items.product_id', '=', 'stocks.product_id')
                        ->where('stocks.branch_id', '=', $sourceBranchId);
                })
                ->where('sales_header.branch_id', $sourceBranchId)
                ->whereDate('sales_header.date', '>=', $fromDate)
                ->whereDate('sales_header.date', '<=', $toDate)
                ->where('sales_header.status', 'active') // Only count active sales
                ->select(
                    'products.id as product_id',
                    'products.code',
                    'products.description as name',
                    'products.category_id',
                    DB::raw('SUM(sale_items.quantity) as total_quantity_sold'),
                    DB::raw('COALESCE(MAX(stocks.current_stock), 0) as available_stock')
                )
                ->groupBy('products.id', 'products.code', 'products.description', 'products.category_id');

            // Filter by category if provided
            if ($categoryId) {
                $query->where('products.category_id', $categoryId);
            }

            $soldProducts = $query->get();

            // Get category names
            $soldProducts = $soldProducts->map(function ($item) {
                $category = Category::find($item->category_id);
                return [
                    'id' => $item->product_id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'category' => $category ? $category->name : 'Sin categoría',
                    'category_id' => $item->category_id,
                    'quantity' => (float) $item->total_quantity_sold,
                    'availableStock' => (float) $item->available_stock,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $soldProducts
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos vendidos: ' . $e->getMessage()
            ], 500);
        }
    }
}