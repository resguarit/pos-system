<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseOrderController extends Controller
{
    /**
     * Devuelve el total de compras agrupado por moneda para el mes actual (o por período si se especifica)
     */
    public function summaryByCurrency(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        $now = now();
        if (!$from) {
            $from = $now->copy()->startOfMonth()->toDateString();
        }
        if (!$to) {
            $to = $now->copy()->endOfMonth()->toDateString();
        }
        $summary = PurchaseOrder::whereBetween('order_date', [$from, $to])
            ->where('status', 'completed')
            ->select('currency', DB::raw('SUM(total_amount) as total'))
            ->groupBy('currency')
            ->get()
            ->mapWithKeys(function ($row) {
                return [$row->currency => (float) $row->total];
            });
        // Asegura que ambas monedas estén presentes en la respuesta
        $result = [
            'ARS' => $summary['ARS'] ?? 0.0,
            'USD' => $summary['USD'] ?? 0.0,
        ];
        return response()->json([
            'from' => $from,
            'to' => $to,
            'totals' => $result,
        ]);
    }
    protected $purchaseOrderService;

    public function __construct(\App\Interfaces\PurchaseOrderServiceInterface $purchaseOrderService)
    {
        $this->purchaseOrderService = $purchaseOrderService;
    }

    public function index(Request $request)
    {
        try {
            $query = PurchaseOrder::with(['supplier', 'branch', 'items.product', 'paymentMethod', 'payments.paymentMethod']);

            // Filtro por moneda
            if ($request->has('currency') && $request->currency) {
                $query->byCurrency($request->currency);
            }

            // Filtro por rango de fechas
            if ($request->has('from') && $request->from) {
                $query->whereDate('order_date', '>=', $request->from);
            }
            if ($request->has('to') && $request->to) {
                $query->whereDate('order_date', '<=', $request->to);
            }

            // Filtro por estado
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filtro por proveedor
            if ($request->has('supplier_id') && $request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }

            // Filtro por sucursal
            if ($request->has('branch_id') && $request->branch_id) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filtro de búsqueda general
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('id', 'like', "%{$search}%")
                        ->orWhereHas('supplier', function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%");
                        });
                });
            }

            $perPage = $request->input('per_page', 15);
            $purchaseOrders = $query->latest()->paginate($perPage);
            return response()->json($purchaseOrders);
        } catch (Exception $e) {
            Log::error("Error fetching purchase orders: " . $e->getMessage());
            return response()->json(['message' => 'Error fetching purchase orders', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'currency' => 'required|in:ARS,USD',
            'order_date' => 'required|date',
            'notes' => 'nullable|string',
            'payment_method_id' => 'nullable|exists:payment_methods,id', // Made nullable for multiple payments
            'payments' => 'nullable|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0',
            'affects_cash_register' => 'nullable|boolean',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.purchase_price' => 'required|numeric|min:0',
        ]);

        try {
            $purchaseOrder = $this->purchaseOrderService->createPurchaseOrder($validatedData);
            return response()->json($purchaseOrder->load(['supplier', 'branch', 'items.product', 'paymentMethod', 'payments.paymentMethod']), 201);
        } catch (Exception $e) {
            Log::error("Error creating purchase order: " . $e->getMessage());
            return response()->json(['message' => 'Error creating purchase order', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $purchaseOrder = PurchaseOrder::with(['supplier', 'branch', 'items.product', 'paymentMethod', 'payments.paymentMethod'])->findOrFail($id);
            return response()->json($purchaseOrder);
        } catch (Exception $e) {
            Log::error("Error fetching purchase order {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Purchase order not found', 'error' => $e->getMessage()], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'supplier_id' => 'sometimes|required|exists:suppliers,id',
            'branch_id' => 'sometimes|required|exists:branches,id',
            'order_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'payment_method_id' => 'sometimes|nullable|exists:payment_methods,id',
            'payments' => 'nullable|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0',
            'affects_cash_register' => 'nullable|boolean',
            'items' => 'sometimes|required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.purchase_price' => 'required|numeric|min:0',
        ]);

        try {
            $purchaseOrder = $this->purchaseOrderService->updatePurchaseOrder($id, $validatedData);
            return response()->json($purchaseOrder->load(['supplier', 'branch', 'items.product', 'paymentMethod', 'payments.paymentMethod']));
        } catch (Exception $e) {
            Log::error("Error updating purchase order {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Error updating purchase order', 'error' => $e->getMessage()], 500);
        }
    }

    public function finalize(Request $request, $id)
    {
        try {
            $paymentMethodId = $request->input('payment_method_id');
            $order = $this->purchaseOrderService->completePurchaseOrder($id, $paymentMethodId);

            return response()->json([
                'message' => 'Orden finalizada y movimiento registrado',
                'order' => $order,
            ]);
        } catch (Exception $e) {
            Log::error('Error finalizando orden de compra: ' . $e->getMessage());
            return response()->json(['message' => 'Error finalizando orden', 'error' => $e->getMessage()], 500);
        }
    }

    public function downloadPdf(Request $request, $id)
    {
        try {
            $order = PurchaseOrder::with(['supplier', 'branch', 'items.product', 'payments.paymentMethod'])->findOrFail($id);
            $showPricesParam = $request->query('show_prices', '1');
            $showPrices = in_array(strtolower((string) $showPricesParam), ['1', 'true', 'yes', 'si'], true);
            $pdf = Pdf::loadView('purchase-order-pdf', [
                'order' => $order,
                'showPrices' => $showPrices,
            ])->setPaper('a4', 'portrait');
            $filename = sprintf('orden-compra-%s.pdf', $order->id);
            return $pdf->stream($filename);
        } catch (Exception $e) {
            Log::error("Error generating purchase order PDF: " . $e->getMessage());
            return response()->json(['message' => 'Error generating PDF', 'error' => $e->getMessage()], 500);
        }
    }

    public function cancel(Request $request, $id)
    {
        try {
            $order = PurchaseOrder::findOrFail($id);

            if ($order->status === 'cancelled') {
                return response()->json(['message' => 'La orden ya está cancelada'], 400);
            }

            // If the order is completed, use the service method that reverts everything
            if ($order->status === 'completed') {
                $cancelledOrder = $this->purchaseOrderService->cancelCompletedPurchaseOrder($id);
                return response()->json([
                    'message' => 'Orden completada cancelada y revertida correctamente',
                    'order' => $cancelledOrder,
                    'reverted' => true,
                ]);
            }

            // For pending orders, just change the status
            $order->status = 'cancelled';
            $order->save();
            return response()->json([
                'message' => 'Orden cancelada correctamente',
                'order' => $order,
                'reverted' => false,
            ]);
        } catch (Exception $e) {
            Log::error('Error cancelando orden de compra: ' . $e->getMessage());
            return response()->json(['message' => 'Error cancelando orden', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get preview data for cancelling a completed purchase order
     */
    public function cancelPreview(Request $request, $id)
    {
        try {
            $preview = $this->purchaseOrderService->getCancellationPreview($id);
            return response()->json($preview);
        } catch (Exception $e) {
            Log::error('Error obteniendo preview de cancelación: ' . $e->getMessage());
            return response()->json(['message' => 'Error obteniendo preview', 'error' => $e->getMessage()], 400);
        }
    }

}
