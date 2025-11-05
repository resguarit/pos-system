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
        'metadata.use_favor_credit' => 'nullable|boolean',
        'metadata.favor_credit_amount' => 'nullable|numeric|min:0',
        'metadata.current_account_id' => 'nullable|integer',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    // Validación adicional: suma de pagos debe coincidir con el total después de aplicar crédito a favor
    $requestData = $request->all();
    
    // Obtener crédito a favor del metadata si existe
    $favorCreditAmount = 0;
    if (isset($requestData['metadata']['use_favor_credit']) && 
        $requestData['metadata']['use_favor_credit'] === true &&
        isset($requestData['metadata']['favor_credit_amount'])) {
        $favorCreditAmount = floatval($requestData['metadata']['favor_credit_amount']);
    }
    
    // Obtener el ID del método de pago "Crédito a favor" para excluirlo de la validación
    $favorCreditPaymentMethod = PaymentMethod::where('name', 'Crédito a favor')->first();
    $favorCreditPaymentMethodId = $favorCreditPaymentMethod ? $favorCreditPaymentMethod->id : null;
    
    // Calcular suma de pagos EXCLUYENDO el crédito a favor (porque se crea automáticamente después)
    $totalPayments = 0;
    if (isset($requestData['payments']) && is_array($requestData['payments'])) {
        foreach ($requestData['payments'] as $payment) {
            // Excluir pagos de crédito a favor de la suma (se crearán automáticamente después)
            if ($favorCreditPaymentMethodId && (int)($payment['payment_method_id'] ?? 0) === $favorCreditPaymentMethodId) {
                continue;
            }
            $totalPayments += floatval($payment['amount'] ?? 0);
        }
    }
    
    $totalSale = floatval($requestData['total'] ?? 0);
    
    // El total a comparar es el total de la venta menos el crédito a favor aplicado
    $totalToCompare = $totalSale - $favorCreditAmount;
    
    // Permitir diferencia de hasta 0.01 para compensar redondeos
    $difference = abs($totalPayments - $totalToCompare);
    if ($difference > 0.01) {
        return response()->json([
            'errors' => [
                'payments' => ['La suma de los pagos (' . number_format($totalPayments, 2) . ') no coincide con el total de la venta (' . number_format($totalSale, 2) . ($favorCreditAmount > 0 ? ' menos crédito a favor de ' . number_format($favorCreditAmount, 2) : '') . ' = ' . number_format($totalToCompare, 2) . ')']
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

        // Obtener crédito a favor del metadata antes de crear la venta (obtener del request completo)
        $favorCreditAmount = 0;
        $requestData = $request->all();
        if (isset($requestData['metadata']['use_favor_credit']) && 
            $requestData['metadata']['use_favor_credit'] === true &&
            isset($requestData['metadata']['favor_credit_amount'])) {
            $favorCreditAmount = floatval($requestData['metadata']['favor_credit_amount']);
        }
        
        // IMPORTANTE: Asegurar que los metadatos se incluyan en saleData si existen
        if (isset($requestData['metadata']) && is_array($requestData['metadata'])) {
            $saleData['metadata'] = $requestData['metadata'];
        }

        // Obtener el ID del método de pago "Crédito a favor" para excluirlo de la validación
        $favorCreditPaymentMethod = PaymentMethod::where('name', 'Crédito a favor')->first();
        $favorCreditPaymentMethodId = $favorCreditPaymentMethod ? $favorCreditPaymentMethod->id : null;

        $saleHeader = $this->saleService->createSale($saleData, false);

        // Calcular suma de pagos EXCLUYENDO el crédito a favor (porque se crea automáticamente después)
        $paymentsTotal = round((float) collect($payments)->sum(function ($p) use ($favorCreditPaymentMethodId) {
            // Excluir pagos de crédito a favor de la suma (se crearán automáticamente después)
            if ($favorCreditPaymentMethodId && (int)($p['payment_method_id'] ?? 0) === $favorCreditPaymentMethodId) {
                return 0;
            }
            return (float) ($p['amount'] ?? 0);
        }), 2);
        
        $saleTotal = round((float) $saleHeader->total, 2);
        
        // El total a comparar es el total de la venta menos el crédito a favor aplicado
        $totalToCompare = round($saleTotal - $favorCreditAmount, 2);
        $diff = round($totalToCompare - $paymentsTotal, 2);
        
        if (abs($diff) > 0.01) {
            if (count($payments) > 0 && abs($diff) <= 1000) {
                // Ajustar el último pago que NO sea crédito a favor
                $lastIndex = count($payments) - 1;
                for ($i = $lastIndex; $i >= 0; $i--) {
                    if (!$favorCreditPaymentMethodId || (int)($payments[$i]['payment_method_id'] ?? 0) !== $favorCreditPaymentMethodId) {
                        $payments[$i]['amount'] = round(((float) $payments[$i]['amount']) + $diff, 2);
                        break;
                    }
                }
            } else {
                throw new \Exception("La suma de los pagos ($paymentsTotal) no coincide con el total de la venta ($saleTotal" . ($favorCreditAmount > 0 ? " menos crédito a favor de $favorCreditAmount" : '') . " = $totalToCompare). Diferencia: $diff");
            }
        }

        // Crear pagos EXCLUYENDO el crédito a favor (se crea después automáticamente)
        foreach ($payments as $payment) {
            // No crear el pago si es crédito a favor (se crea después automáticamente)
            if ($favorCreditPaymentMethodId && (int)($payment['payment_method_id'] ?? 0) === $favorCreditPaymentMethodId) {
                continue;
            }
            SalePayment::create([
                'sale_header_id' => $saleHeader->id,
                'payment_method_id' => $payment['payment_method_id'],
                'amount' => $payment['amount'],
            ]);
        }

        // Crear registro de pago para crédito a favor si se aplicó (esto se hace después para evitar duplicados)
        if ($favorCreditAmount > 0 && $favorCreditPaymentMethod) {
            SalePayment::create([
                'sale_header_id' => $saleHeader->id,
                'payment_method_id' => $favorCreditPaymentMethod->id,
                'amount' => $favorCreditAmount,
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
    
    // IMPORTANTE: Contar TODOS los pagos, incluyendo crédito a favor
    // El crédito a favor no afecta la caja pero SÍ reduce la deuda pendiente
    // Los pagos a cuenta corriente (cuando se selecciona como método de pago) NO deben contar
    $favorCreditMethod = PaymentMethod::where('name', 'Crédito a favor')->first();
    $favorCreditMethodId = $favorCreditMethod ? $favorCreditMethod->id : null;
    
    $totalPaid = (float)$saleHeader->salePayments
        ->filter(function ($payment) use ($favorCreditMethodId) {
            $paymentMethod = $payment->paymentMethod;
            
            // Incluir crédito a favor (aunque no afecte caja)
            if ($favorCreditMethodId && $paymentMethod && (int)$paymentMethod->id === $favorCreditMethodId) {
                return true;
            }
            
            // Incluir pagos que afectan caja
            if ($paymentMethod && $paymentMethod->affects_cash === true) {
                return true;
            }
            
            // Excluir pagos a cuenta corriente (método de pago, no crédito a favor)
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
