<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Product;
use App\Models\Sale;
use App\Models\PaymentMethod;
use App\Models\SalePayment;
use App\Models\SaleHeader;
use App\Models\SaleItem;
use App\Models\SaleIva;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Services\SaleService;
use Illuminate\Support\Facades\Log;
use App\Models\ReceiptType;

class PosController extends Controller
{
    protected $saleService;

    public function __construct(SaleService $saleService)
    {
        $this->saleService = $saleService;
    }
    public function searchProducts(Request $request)
    {
        $query = $request->input('query');

        if (empty($query)) {
            // Opcional: devolver productos populares o recientes si la búsqueda está vacía
            return response()->json([]);
        }

        $products = Product::where('description', 'LIKE', "%{$query}%")
                           ->orWhere('code', '=', $query)
                           ->take(20) // Limitar el número de resultados
                           ->get();

        return response()->json($products);
    }

    public function getPaymentMethods()
    {
        $paymentMethods = PaymentMethod::where('is_active', true)->get();
        return response()->json($paymentMethods);
    }

    public function storeSale(Request $request)
{
    $validator = Validator::make($request->all(), [
        'date' => 'sometimes|date',
        'receipt_type_id' => 'required|integer|exists:receipt_type,id', // Corregido a receipt_types por convención
        'branch_id' => 'required|integer|exists:branches,id',
        'customer_id' => 'nullable|integer|exists:customers,id',
        'sale_fiscal_condition_id' => 'nullable|integer|exists:fiscal_conditions,id',
        'sale_document_type_id' => 'nullable|integer|exists:document_types,id',
        'sale_document_number' => 'nullable|string|max:255',
        'iibb' => 'nullable|numeric|min:0',
        'internal_tax' => 'nullable|numeric|min:0',
        'discount_type' => 'nullable|in:percent,amount',
        'discount_value' => 'nullable|numeric|min:0',
        // Totales calculados por el frontend
        'subtotal_net' => 'nullable|numeric|min:0',
        'total_iva' => 'nullable|numeric|min:0',
        'total' => 'nullable|numeric|min:0',
        'total_discount' => 'nullable|numeric|min:0',
        'cae' => 'nullable|string|max:255',
        'cae_expiration_date' => 'nullable|date',
        'service_from_date' => 'nullable|date',
        'service_to_date' => 'nullable|date|after_or_equal:service_from_date',
        'service_due_date' => 'nullable|date',
        'items' => 'required|array|min:1',
        'items.*.product_id' => 'required|integer|exists:products,id',
        'items.*.quantity' => 'required|numeric|min:0.001',
        'items.*.unit_price' => 'nullable|numeric|min:0',
        'items.*.discount_type' => 'nullable|in:percent,amount',
        'items.*.discount_value' => 'nullable|numeric|min:0',
        'payments' => 'required|array|min:1',
        'payments.*.payment_method_id' => 'required|integer|exists:payment_methods,id',
        'payments.*.amount' => 'required|numeric|min:0',
        'metadata' => 'nullable|array',
        'metadata.current_account_id' => 'nullable|integer',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    // Validación adicional: suma de pagos debe coincidir con el total
    $requestData = $request->all();
    
    // Calcular suma de pagos
    $totalPayments = 0;
    if (isset($requestData['payments']) && is_array($requestData['payments'])) {
        foreach ($requestData['payments'] as $payment) {
            $totalPayments += floatval($payment['amount'] ?? 0);
        }
    }
    
    $totalSale = floatval($requestData['total'] ?? 0);
    
    // Permitir diferencia de hasta 0.01 para compensar redondeos
    $difference = abs($totalPayments - $totalSale);
    if ($difference > 0.01) {
        return response()->json([
            'errors' => [
                'payments' => ['La suma de los pagos (' . number_format($totalPayments, 2) . ') no coincide con el total de la venta (' . number_format($totalSale, 2) . ')']
            ]
        ], 422);
    }

    $user = auth()->user();
    if ($user && !$user->branches()->where('branches.id', $request->branch_id)->exists()) {
        return response()->json(['message' => 'No tienes acceso a esta sucursal'], 403);
    }

    DB::beginTransaction();

    try {
        $saleData = $validator->validated();
        $saleData['user_id'] = auth()->id() ?? 1;
        
        $cashRegisterId = null;
        if ($request->has('current_cash_register_id')) {
            $cashRegisterId = $request->input('current_cash_register_id');
            $saleData['current_cash_register_id'] = $cashRegisterId;
        }
        
        $payments = $saleData['payments'];
        unset($saleData['payments']);
        
        // IMPORTANTE: Asegurar que los metadatos se incluyan en saleData si existen
        $requestData = $request->all();
        if (isset($requestData['metadata']) && is_array($requestData['metadata'])) {
            $saleData['metadata'] = $requestData['metadata'];
        }

        $saleHeader = $this->saleService->createSale($saleData, false);

        // Calcular suma de pagos
        $paymentsTotal = round((float) collect($payments)->sum(function ($p) {
            return (float) ($p['amount'] ?? 0);
        }), 2);
        
        $saleTotal = round((float) $saleHeader->total, 2);
        $diff = round($saleTotal - $paymentsTotal, 2);
        
        if (abs($diff) > 0.01) {
            if (count($payments) > 0 && abs($diff) <= 1000) {
                // Ajustar el último pago
                $lastIndex = count($payments) - 1;
                $payments[$lastIndex]['amount'] = round(((float) $payments[$lastIndex]['amount']) + $diff, 2);
            } else {
                throw new \Exception("La suma de los pagos ($paymentsTotal) no coincide con el total de la venta ($saleTotal). Diferencia: $diff");
            }
        }

        // Crear todos los pagos
        foreach ($payments as $payment) {
            SalePayment::create([
                'sale_header_id' => $saleHeader->id,
                'payment_method_id' => $payment['payment_method_id'],
                'amount' => $payment['amount'],
            ]);
        }

        // Actualizar payment_status y paid_amount de la venta
        $this->updateSalePaymentStatus($saleHeader);

        // --- INICIO DE LA MODIFICACIÓN ---

        // Buscamos el tipo de comprobante para la verificación.
        $receiptType = ReceiptType::find($saleData['receipt_type_id']);

        // Ahora, registramos el movimiento de caja solo si NO es un presupuesto.
        if ($receiptType && $receiptType->name !== 'Presupuesto') {
            $this->saleService->registerSaleMovementFromPayments($saleHeader, $cashRegisterId);
        }

        // --- FIN DE LA MODIFICACIÓN ---

        DB::commit();

        return response()->json([
            'message' => 'Venta creada con éxito', 
            'data' => $saleHeader->load([
                'items.product', 
                'saleIvas', 
                'salePayments.paymentMethod', 
                'customer.person', 
                'receiptType', 
                'branch',
                'user.person'
            ])
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => 'Error al crear la venta: ' . $e->getMessage()], 500);
    }
}

/**
 * Actualizar el estado de pago de una venta basándose en sus pagos
 */
private function updateSalePaymentStatus(SaleHeader $saleHeader): void
{
    $saleHeader->load('salePayments.paymentMethod');
    
    // Contar solo los pagos que afectan caja
    // Los pagos a cuenta corriente (cuando se selecciona como método de pago) NO deben contar
    $totalPaid = (float)$saleHeader->salePayments
        ->filter(function ($payment) {
            $paymentMethod = $payment->paymentMethod;
            
            // Incluir solo pagos que afectan caja
            if ($paymentMethod && $paymentMethod->affects_cash === true) {
                return true;
            }
            
            // Excluir pagos a cuenta corriente
            return false;
        })
        ->sum('amount');
    
    $total = (float)$saleHeader->total;
    
    if ($totalPaid >= $total) {
        $saleHeader->payment_status = 'paid';
        $saleHeader->paid_amount = $total;
    } elseif ($totalPaid > 0) {
        $saleHeader->payment_status = 'partial';
        $saleHeader->paid_amount = $totalPaid;
    } else {
        $saleHeader->payment_status = 'pending';
        $saleHeader->paid_amount = 0;
    }
    
    $saleHeader->save();
}
}
