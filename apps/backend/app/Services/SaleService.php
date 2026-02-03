<?php
namespace App\Services;

use App\Constants\AfipConstants;
use App\Constants\SaleNumberingScope;
use App\Interfaces\SaleServiceInterface;
use App\Services\CashMovementService;
use App\Services\CurrentAccountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Customer;
use App\Models\SaleHeader;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\SaleIva;
use App\Models\PaymentMethod;
use App\Models\ReceiptType;
use App\Helpers\SettingHelper;
use Resguar\AfipSdk\DTOs\InvoiceResponse;
use Resguar\AfipSdk\Facades\Afip;
use Carbon\Carbon;
use Illuminate\Support\Collection as SupportCollection;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Pagination\LengthAwarePaginator;

class SaleService implements SaleServiceInterface
{
    /**
     * Tipos de comprobante habilitados por AFIP (FEParamGetTiposCbte).
     * Clave = código AFIP, Valor = descripción de referencia.
     *
     * @var array<int, string>
     */
    private const SUPPORTED_AFIP_RECEIPT_TYPES = [
        1 => 'FACTURA A',
        2 => 'NOTA DE DEBITO A',
        3 => 'NOTA DE CREDITO A',
        4 => 'RECIBO A',
        5 => 'NOTA DE VENTA AL CONTADO A',
        6 => 'FACTURA B',
        7 => 'NOTA DE DEBITO B',
        8 => 'NOTA DE CREDITO B',
        9 => 'RECIBO B',
        10 => 'NOTA DE VENTA AL CONTADO B',
        11 => 'FACTURA C',
        12 => 'NOTA DE DEBITO C',
        13 => 'NOTA DE CREDITO C',
        15 => 'RECIBO C',
        49 => 'FACTURA M',
        50 => 'NOTA DE DEBITO M',
        51 => 'NOTA DE CREDITO M',
        52 => 'RECIBO M',
    ];

    /** Máximo de intentos al generar número de comprobante único ante colisión */
    private const RECEIPT_NUMBER_MAX_ATTEMPTS = 10;

    /**
     * Prepara los items de venta calculando precios unitarios, descuentos, base e IVA.
     * Descuentos: por ítem antes de IVA. Montos con hasta 2 decimales.
     */
    private function mergeAndPrepareSaleItems(array $itemsData): array
    {
        $preparedItems = [];

        foreach ($itemsData as $item) {
            $product = Product::with('iva')->find($item['product_id']);
            if (!$product) {
                throw new \Exception("Producto con ID {$item['product_id']} no encontrado");
            }

            $unitPrice = (float) ($item['unit_price'] ?? $product->sale_price);
            $quantity = (float) $item['quantity'];
            $ivaRate = $product->iva ? (float) $product->iva->rate : 0.0;

            // Base bruta
            $itemSubtotalBase = (float) ($unitPrice * $quantity); // sin redondear todavía

            // Descuento por ítem (opcional)
            $discountType = $item['discount_type'] ?? null; // 'percent' | 'amount' | null
            $discountValue = isset($item['discount_value']) ? (float) $item['discount_value'] : null; // number
            $itemDiscountAmount = 0.0;
            if ($discountType && $discountValue !== null) {
                if ($discountType === 'percent') {
                    $itemDiscountAmount = round(($itemSubtotalBase) * ($discountValue / 100.0), 2);
                } else {
                    $itemDiscountAmount = round($discountValue, 2);
                }
                // Cap al subtotal base
                if ($itemDiscountAmount > $itemSubtotalBase) {
                    $itemDiscountAmount = round($itemSubtotalBase, 2);
                }
            }

            // Base neta antes de IVA
            $netBase = round($itemSubtotalBase - $itemDiscountAmount, 2);
            if ($netBase < 0) {
                $netBase = 0.0;
            }

            // IVA sobre base neta
            $itemIva = round($netBase * ($ivaRate / 100.0), 2);
            $itemTotal = round($netBase + $itemIva, 2);

            $preparedItems[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => round($unitPrice, 2),
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'discount_amount' => $itemDiscountAmount, // solo descuento explícito del ítem
                'iva_rate' => $ivaRate,
                'iva_id' => $product->iva ? $product->iva->id : null,
                // Guardamos la base neta como item_subtotal
                'item_subtotal' => $netBase,
                'item_iva' => $itemIva,
                'item_total' => $itemTotal,
                // Auxiliares no persistidos, útiles para cálculos posteriores
                '_net_base' => $netBase,
            ];
        }

        return $preparedItems;
    }

    public function createSale(array $data, bool $registerMovement = true): SaleHeader
    {
        // Se usa una transacción para garantizar que si algo falla, no se guarde nada.
        return DB::transaction(function () use ($data, $registerMovement) {
            // 0) Validación: No se puede crear un presupuesto desde otro presupuesto
            if (isset($data['converted_from_budget_id']) && $data['converted_from_budget_id']) {
                $receiptType = ReceiptType::find($data['receipt_type_id'] ?? null);
                if ($receiptType && AfipConstants::isPresupuesto($receiptType->afip_code)) {
                    throw new \InvalidArgumentException(
                        'No se puede crear un presupuesto desde otro presupuesto. ' .
                        'Seleccione un tipo de comprobante de venta (Factura A, B, C, X, etc.).'
                    );
                }
            }

            // 1) Items y limpieza
            $itemsData = $data['items'];
            unset($data['items']);

            // 2) Preparar ítems (con descuento por ítem aplicado antes de IVA)
            $preparedItems = $this->mergeAndPrepareSaleItems($itemsData);

            // 2.1) Subtotal neto antes de descuento global (suma de bases netas por ítem)
            $subtotalNetBeforeGlobal = 0.0;
            foreach ($preparedItems as $pi) {
                $subtotalNetBeforeGlobal = round($subtotalNetBeforeGlobal + (float) ($pi['_net_base'] ?? ($pi['item_subtotal'] ?? 0.0)), 2);
            }

            // 2.2) Calcular IVA SIN descuento global primero
            foreach ($preparedItems as &$item) {
                $netBase = round((float) ($item['_net_base'] ?? ($item['item_subtotal'] ?? 0.0)), 2);
                $item['item_subtotal'] = $netBase;
                $item['item_iva'] = round($netBase * (((float) ($item['iva_rate'] ?? 0.0)) / 100.0), 2);
                $item['item_total'] = round($item['item_subtotal'] + $item['item_iva'], 2);
                $item['_net_base'] = $netBase;
            }
            unset($item);

            // 3) Totales y desglose de IVA por tasa
            $subtotalNetFinal = 0.0; // suma bases netas finales (con descuentos)
            $totalIvaAmount = 0.0;
            $ivaTotals = [];
            foreach ($preparedItems as $item) {
                $subtotalNetFinal = round($subtotalNetFinal + (float) $item['item_subtotal'], 2);
                $totalIvaAmount = round($totalIvaAmount + (float) $item['item_iva'], 2);
                if (!empty($item['iva_id'])) {
                    $rateKey = (string) ($item['iva_rate'] ?? 0);
                    if (!isset($ivaTotals[$rateKey])) {
                        $ivaTotals[$rateKey] = [
                            'iva_id' => $item['iva_id'],
                            'iva_rate' => $item['iva_rate'],
                            'base_amount' => 0.0,
                            'iva_amount' => 0.0,
                        ];
                    }
                    $ivaTotals[$rateKey]['base_amount'] = round($ivaTotals[$rateKey]['base_amount'] + (float) $item['item_subtotal'], 2);
                    $ivaTotals[$rateKey]['iva_amount'] = round($ivaTotals[$rateKey]['iva_amount'] + (float) $item['item_iva'], 2);
                }
            }

            // Subtotal bruto sin descuentos (para mostrar descuentos por separado)
            $subtotalGrossBeforeDiscounts = 0.0;
            foreach ($preparedItems as $item) {
                $lineGross = round(((float) ($item['unit_price'] ?? 0)) * ((float) ($item['quantity'] ?? 0)), 2);
                $subtotalGrossBeforeDiscounts = round($subtotalGrossBeforeDiscounts + $lineGross, 2);
            }

            // Total de descuentos por ítem (solo explícitos) y total aplicado (ítems + global)
            $sumPerItemDiscounts = 0.0;
            foreach ($preparedItems as $item) {
                $sumPerItemDiscounts = round($sumPerItemDiscounts + (float) ($item['discount_amount'] ?? 0.0), 2);
            }

            $iibb = round((float) ($data['iibb'] ?? 0.0), 2);
            $internalTax = round((float) ($data['internal_tax'] ?? 0.0), 2);

            // 2.3) Aplicar descuento global DESPUÉS del IVA (sobre el total con IVA)
            $globalDiscountType = $data['discount_type'] ?? null; // 'percent'|'amount'|null
            $globalDiscountValue = isset($data['discount_value']) ? (float) $data['discount_value'] : null; // number
            $globalDiscountAmount = 0.0;

            // Calcular subtotal + IVA antes del descuento global
            $subtotalConIva = round($subtotalGrossBeforeDiscounts + $totalIvaAmount, 2);

            if ($globalDiscountType && $globalDiscountValue !== null && $subtotalConIva > 0) {
                if ($globalDiscountType === 'percent') {
                    $globalDiscountAmount = round($subtotalConIva * ($globalDiscountValue / 100.0), 2);
                } else { // amount
                    $globalDiscountAmount = round($globalDiscountValue, 2);
                }
                if ($globalDiscountAmount > $subtotalConIva) {
                    $globalDiscountAmount = round($subtotalConIva, 2);
                }
            }

            // Total de descuentos (por ítem + global)
            $totalDiscountApplied = round($sumPerItemDiscounts + (float) $globalDiscountAmount, 2);

            // Total final = Subtotal + IVA - Descuento Global + otros impuestos
            $finalTotal = round($subtotalConIva - $globalDiscountAmount + $iibb + $internalTax, 2);

            // 4) Usar totales del frontend si están disponibles (para evitar diferencias de redondeo)
            if (isset($data['total']) && is_numeric($data['total'])) {
                $finalTotal = (float) $data['total'];
            }
            if (isset($data['total_iva']) && is_numeric($data['total_iva'])) {
                $totalIvaAmount = (float) $data['total_iva'];
            }
            if (isset($data['subtotal_net']) && is_numeric($data['subtotal_net'])) {
                $subtotalNetFinal = (float) $data['subtotal_net'];
            }
            if (isset($data['total_discount']) && is_numeric($data['total_discount'])) {
                $totalDiscountApplied = (float) $data['total_discount'];
            }

            // 5) Asignar campos en cabecera
            $data['subtotal'] = $subtotalGrossBeforeDiscounts; // persistir subtotal SIN descuentos
            $data['total_iva_amount'] = $totalIvaAmount;
            $data['discount_type'] = $globalDiscountType; // tipo de descuento global
            $data['discount_value'] = $globalDiscountValue; // valor de descuento global
            $data['discount_amount'] = $totalDiscountApplied; // total aplicado (ítems + global)
            $data['total'] = $finalTotal;
            $data['date'] = isset($data['date']) ? Carbon::parse($data['date']) : Carbon::now();

            // 5.1) Determinar estado inicial basado en tipo de comprobante
            // Ventas normales -> 'active'
            // Presupuestos (AFIP 016) -> 'pending'
            try {
                $receiptTypeForStatus = ReceiptType::find($data['receipt_type_id'] ?? null);
            } catch (\Throwable $e) {
                $receiptTypeForStatus = null;
            }

            if ($receiptTypeForStatus && AfipConstants::isPresupuesto($receiptTypeForStatus->afip_code)) {
                $data['status'] = 'pending';
            } else {
                $data['status'] = 'active';
            }

            // Alcance de numeración: presupuesto tiene secuencia propia; el resto comparte secuencia contigua.
            $data['numbering_scope'] = ($receiptTypeForStatus && AfipConstants::isPresupuesto($receiptTypeForStatus->afip_code))
                ? SaleNumberingScope::PRESUPUESTO
                : SaleNumberingScope::SALE;

            // 6) Numeración de comprobante
            // Presupuesto (016): secuencia propia por tipo. Resto: secuencia contigua única por sucursal (todas las ventas).
            $data['receipt_number'] = $this->getNextReceiptNumberForBranch(
                (int) $data['branch_id'],
                (int) $data['receipt_type_id']
            );

            // Verificar que el número no exista ya en el mismo alcance (protección contra duplicados y condiciones de carrera)
            $existingSale = SaleHeader::where('branch_id', $data['branch_id'])
                ->where('numbering_scope', $data['numbering_scope'])
                ->where('receipt_number', $data['receipt_number'])
                ->lockForUpdate()
                ->first();

            if ($existingSale) {
                $nextReceiptNumber = (int) $data['receipt_number'];
                $attempts = 0;
                while ($existingSale && $attempts < self::RECEIPT_NUMBER_MAX_ATTEMPTS) {
                    $nextReceiptNumber++;
                    $data['receipt_number'] = str_pad((string) $nextReceiptNumber, AfipConstants::RECEIPT_NUMBER_PADDING, '0', STR_PAD_LEFT);
                    $existingSale = SaleHeader::where('branch_id', $data['branch_id'])
                        ->where('numbering_scope', $data['numbering_scope'])
                        ->where('receipt_number', $data['receipt_number'])
                        ->lockForUpdate()
                        ->first();
                    $attempts++;
                }

                if ($existingSale) {
                    throw new \Exception("No se pudo generar un número de comprobante único después de varios intentos. Contacte al administrador.");
                }
            }

            // 6.1) Identidad fiscal del cliente: si se envió customer_tax_identity_id, usarla para CUIT y condición fiscal
            if (!empty($data['customer_tax_identity_id'])) {
                $chosenIdentity = \App\Models\CustomerTaxIdentity::with('fiscalCondition')
                    ->where('id', $data['customer_tax_identity_id'])
                    ->where('customer_id', $data['customer_id'] ?? null)
                    ->first();
                if ($chosenIdentity) {
                    $data['sale_fiscal_condition_id'] = (int) $chosenIdentity->fiscal_condition_id;
                    $data['sale_document_number'] = $chosenIdentity->cuit
                        ? preg_replace('/[^0-9]/', '', (string) $chosenIdentity->cuit)
                        : ($data['sale_document_number'] ?? null);
                }
            }
            // Si hay cliente pero no identidad elegida ni condición fiscal, derivar de la identidad por defecto
            if (!empty($data['customer_id']) && empty($data['sale_fiscal_condition_id'])) {
                $customer = Customer::with('taxIdentities')->find($data['customer_id']);
                $defaultIdentity = $customer?->taxIdentities->where('is_default', true)->first()
                    ?? $customer?->taxIdentities->first();
                if ($defaultIdentity && !empty($defaultIdentity->fiscal_condition_id)) {
                    $data['sale_fiscal_condition_id'] = (int) $defaultIdentity->fiscal_condition_id;
                    if (empty($data['sale_document_number']) && !empty($defaultIdentity->cuit)) {
                        $data['sale_document_number'] = preg_replace('/[^0-9]/', '', (string) $defaultIdentity->cuit);
                    }
                }
            }

            // 7) Crear cabecera
            $saleHeader = SaleHeader::create($data);

            // 8) Crear ítems
            foreach ($preparedItems as $item) {
                $payload = $item;
                unset($payload['_net_base']);
                $payload['sale_header_id'] = $saleHeader->id;
                SaleItem::create($payload);
            }

            // 9) Crear desglose de IVA por tasa
            foreach ($ivaTotals as $total) {
                $total['sale_header_id'] = $saleHeader->id;
                SaleIva::create($total);
            }

            // 10) Reducir stock para ventas que NO son presupuestos
            $receiptType = ReceiptType::find($data['receipt_type_id'] ?? null);
            // Reducir stock si NO es presupuesto (afip_code 016)
            $shouldReduceStock = !$receiptType || !AfipConstants::isPresupuesto($receiptType->afip_code);

            if ($shouldReduceStock) {
                $branchId = $data['branch_id'];
                $stockService = app(\App\Services\StockService::class);
                $stockAlreadyReduced = \Illuminate\Support\Facades\Cache::get("stock_reduced_sale_{$saleHeader->id}");
                if (!$stockAlreadyReduced) {
                    \Illuminate\Support\Facades\Cache::put("stock_reduced_sale_{$saleHeader->id}", true, 300);
                    foreach ($preparedItems as $item) {
                        $stockService->reduceStockByProductAndBranch(
                            $item['product_id'],
                            $branchId,
                            $item['quantity'],
                            'sale',
                            $saleHeader,
                            "Venta #{$saleHeader->receipt_number}"
                        );
                    }
                }
            }

            // 11) Registrar movimientos para ventas (NO presupuestos)
            if ($registerMovement && (!$receiptType || !AfipConstants::isPresupuesto($receiptType->afip_code))) {
                $this->registerSaleMovementFromPayments($saleHeader, $data['current_cash_register_id'] ?? null);
            }

            // 12) Si viene de un presupuesto, actualizar el estado del presupuesto original
            if (isset($data['converted_from_budget_id']) && $data['converted_from_budget_id']) {
                $budget = SaleHeader::lockForUpdate()->find($data['converted_from_budget_id']);
                if ($budget) {
                    $this->validateIsBudget($budget);
                    $this->validateBudgetNotAnnulled($budget);

                    // Validar que el presupuesto no haya sido convertido previamente
                    // para evitar duplicados y mantener integridad de datos
                    if ($budget->status === 'converted' && $budget->converted_to_sale_id) {
                        throw new \Exception('Este presupuesto ya fue convertido a la venta #' . $budget->converted_to_sale_id . '. No se puede convertir nuevamente.');
                    }

                    $budget->status = 'converted';
                    $budget->converted_to_sale_id = $saleHeader->id;
                    $budget->converted_at = Carbon::now();
                    $budget->save();

                    // Actualizar también la referencia en la nueva venta
                    $saleHeader->converted_from_budget_id = $budget->id;
                    $saleHeader->save();
                }
            }

            // 13) Devolver con relaciones
            return $saleHeader->fresh(['items', 'saleIvas']);
        });
    }

    /**
     * Registra el movimiento de caja basándose en los pagos de la venta
     */
    public function registerSaleMovementFromPayments(SaleHeader $sale, ?int $cashRegisterId = null): void
    {
        // IMPORTANTE: Recargar la venta para obtener los metadatos actualizados
        $sale->refresh();

        // Cargar los pagos de la venta
        $sale->load('salePayments.paymentMethod', 'receiptType');

        // Si el comprobante es 'Presupuesto', no registrar movimiento de caja ni cuenta corriente
        if (
            $sale->receiptType && (
                ($sale->receiptType->description ?? $sale->receiptType->name ?? null) === 'Presupuesto'
            )
        ) {
            return;
        }

        // Si la venta tiene cliente, registrar SIEMPRE en cuenta corriente
        if ($sale->customer_id) {
            $this->registerAllSaleMovementsInCurrentAccount($sale);
        }

        // Registrar movimientos de caja para pagos que afectan la caja
        // Excluir: Cuenta Corriente (no afecta caja)
        $hasNonCreditPayments = $sale->salePayments->contains(function ($payment) {
            $paymentMethod = $payment->paymentMethod;
            if (!$paymentMethod) {
                return false;
            }
            // Excluir "Cuenta Corriente"
            if ($paymentMethod->name === 'Cuenta Corriente') {
                return false;
            }
            // Solo incluir métodos de pago que realmente afectan la caja
            return $paymentMethod->affects_cash === true;
        });

        if ($hasNonCreditPayments) {
            if (!$cashRegisterId) {
                throw new \Exception('No se encontró una caja abierta para registrar la venta.');
            }
            $this->registerCashMovement($sale, $cashRegisterId);
        }
    }


    /**
     * Registra movimiento de caja para venta en efectivo
     */
    private function registerCashMovement(SaleHeader $sale, ?int $cashRegisterId): void
    {
        if (!$cashRegisterId) {
            throw new \Exception('No se encontró una caja abierta para registrar la venta.');
        }

        try {
            $cashMovementService = app(CashMovementService::class);

            // Resolver nombre de cliente correctamente
            $customerName = '';
            if ($sale->customer && $sale->customer->person) {
                $customerName = trim(($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? ''));
            } elseif ($sale->customer && $sale->customer->business_name) {
                $customerName = $sale->customer->business_name;
            } else {
                $customerName = 'Consumidor Final';
            }

            $baseDescription = "Venta #{$sale->receipt_number}";
            if ($customerName) {
                $baseDescription .= " - Cliente: {$customerName}";
            }

            // Intentar registrar por cada pago si existen pagos asociados
            $sale->loadMissing('salePayments.paymentMethod');
            if ($sale->relationLoaded('salePayments') && $sale->salePayments && $sale->salePayments->count() > 0) {
                foreach ($sale->salePayments as $payment) {
                    $paymentMethod = $payment->paymentMethod; // puede ser null si no está vinculado

                    // IMPORTANTE: NO registrar en caja si es pago a cuenta corriente
                    if ($paymentMethod && $paymentMethod->name === 'Cuenta Corriente') {
                        continue;
                    }

                    // Solo registrar si el método de pago afecta la caja
                    if (!$paymentMethod || $paymentMethod->affects_cash !== true) {
                        continue;
                    }

                    $movementType = $this->resolveMovementTypeForPaymentMethod($paymentMethod);

                    // Fallback final si no se encontró tipo específico: crear/obtener "Venta en efectivo"
                    if (!$movementType) {
                        $movementType = \App\Models\MovementType::firstOrCreate(
                            ['name' => 'Venta en efectivo', 'operation_type' => 'entrada'],
                            [
                                'description' => 'Ingreso por venta en efectivo',
                                'is_cash_movement' => true,
                                'is_current_account_movement' => false,
                                'active' => true,
                            ]
                        );
                    }

                    // Descripción sin el método de pago
                    $description = $baseDescription;

                    $cashMovementService->createMovement([
                        'cash_register_id' => $cashRegisterId,
                        'movement_type_id' => $movementType ? $movementType->id : null,
                        'payment_method_id' => $paymentMethod ? $paymentMethod->id : null, // Agregar payment_method_id
                        'reference_type' => 'sale',
                        'reference_id' => $sale->id,
                        'amount' => $payment->amount ?? $sale->total, // usar monto del pago
                        'description' => $description,
                        'user_id' => $sale->user_id,
                    ]);
                }
            } else {
                // Fallback: si no hay pagos cargados, mantener comportamiento actual (un único movimiento)
                // Buscar método de pago "Efectivo" por defecto
                $defaultPaymentMethod = \App\Models\PaymentMethod::where('name', 'Efectivo')
                    ->where('is_active', true)
                    ->first();

                $movementType = \App\Models\MovementType::firstOrCreate(
                    ['name' => 'Venta en efectivo', 'operation_type' => 'entrada'],
                    [
                        'description' => 'Ingreso por venta en efectivo',
                        'is_cash_movement' => true,
                        'is_current_account_movement' => false,
                        'active' => true,
                    ]
                );

                $cashMovementService->createMovement([
                    'cash_register_id' => $cashRegisterId,
                    'movement_type_id' => $movementType->id,
                    'payment_method_id' => $defaultPaymentMethod ? $defaultPaymentMethod->id : null, // Agregar payment_method_id por defecto
                    'reference_type' => 'sale',
                    'reference_id' => $sale->id,
                    'amount' => $sale->total,
                    'description' => $baseDescription,
                    'user_id' => $sale->user_id,
                ]);
            }
        } catch (\Exception $e) {
            throw new \Exception('Error al registrar movimiento de caja: ' . $e->getMessage());
        }
    }


    /**
     * Registra TODOS los movimientos de una venta en cuenta corriente
     * 1. Débito (Venta) - Aumenta la deuda
     * 2. Créditos (Pagos) - Reducen la deuda inmediatamente
     */
    private function registerAllSaleMovementsInCurrentAccount(SaleHeader $sale): void
    {
        if (!$sale->customer_id) {
            return; // Sin cliente, no hay cuenta corriente
        }

        try {
            $currentAccountService = app(CurrentAccountService::class);

            // Buscar o crear cuenta corriente del cliente
            $currentAccount = \App\Models\CurrentAccount::firstOrCreate(
                ['customer_id' => $sale->customer_id],
                [
                    'credit_limit' => null,
                    'current_balance' => 0,
                    'status' => 'active',
                    'opened_at' => now()
                ]
            );

            // 1. Registrar DÉBITO: Venta (aumenta la deuda)
            $saleMovementType = \App\Models\MovementType::where('name', 'Venta')
                ->where('operation_type', 'salida')
                ->where('is_current_account_movement', true)
                ->where('active', true)
                ->first();

            if (!$saleMovementType) {
                throw new \Exception('Tipo de movimiento "Venta" no encontrado.');
            }

            // Verificar si ya existe un movimiento de venta para esta venta
            $existingSaleMovement = \App\Models\CurrentAccountMovement::where('sale_id', $sale->id)
                ->where('movement_type_id', $saleMovementType->id)
                ->where('current_account_id', $currentAccount->id)
                ->first();

            // Solo crear el movimiento si no existe ya
            if (!$existingSaleMovement) {
                // Guardar el balance ANTES de registrar la venta para calcular crédito disponible
                $balanceBeforeSale = (float) $currentAccount->current_balance;

                $currentAccountService->createMovement([
                    'current_account_id' => $currentAccount->id,
                    'movement_type_id' => $saleMovementType->id,
                    'amount' => $sale->total,
                    'description' => "Venta #{$sale->receipt_number}",
                    'reference' => $sale->receipt_number,
                    'sale_id' => $sale->id,
                    'metadata' => [
                        'sale_id' => $sale->id,
                        'receipt_number' => $sale->receipt_number,
                        'total_sale' => $sale->total
                    ]
                ]);
            } else {
                // Si la venta ya existe, obtener el balance antes de esa venta
                // Buscar el movimiento de venta para obtener su balance_before
                $balanceBeforeSale = (float) $existingSaleMovement->balance_before;
            }

            // 2. Registrar CRÉDITOS: Pagos (reducen la deuda inmediatamente)
            $currentAccount->refresh();
            $balanceAfterCredit = (float) $currentAccount->current_balance;

            foreach ($sale->salePayments as $payment) {

                $paymentMethod = $payment->paymentMethod;

                // Determinar el tipo de movimiento según el método de pago
                $paymentTypeName = match ($paymentMethod->name ?? 'Efectivo') {
                    'Efectivo' => 'Pago en efectivo',
                    'Tarjeta de crédito', 'Tarjeta de débito' => 'Pago con tarjeta',
                    'Transferencia' => 'Pago con transferencia',
                    'Cuenta Corriente' => 'Pago de cuenta corriente', // No registrar pago inmediato si es a crédito
                    default => 'Pago de cuenta corriente'
                };

                // Si es pago a cuenta corriente, no registrar el crédito (queda pendiente)
                if ($paymentMethod->name === 'Cuenta Corriente') {
                    continue;
                }

                $paymentMovementType = \App\Models\MovementType::where('name', $paymentTypeName)
                    ->where('operation_type', 'entrada')
                    ->where('is_current_account_movement', true)
                    ->where('active', true)
                    ->first();

                if ($paymentMovementType) {
                    $paymentAmount = (float) $payment->amount;

                    // Verificar si ya existe un movimiento de pago para este pago específico
                    // Usamos el payment_id del metadata para distinguir entre pagos múltiples del mismo método y monto
                    $existingPaymentMovement = \App\Models\CurrentAccountMovement::where('sale_id', $sale->id)
                        ->where('movement_type_id', $paymentMovementType->id)
                        ->where('current_account_id', $currentAccount->id)
                        ->where('metadata->payment_id', $payment->id)
                        ->first();

                    // Solo crear el movimiento si no existe ya
                    if (!$existingPaymentMovement) {
                        $currentAccountService->createMovement([
                            'current_account_id' => $currentAccount->id,
                            'movement_type_id' => $paymentMovementType->id,
                            'amount' => $paymentAmount, // Usar el monto original del pago
                            'description' => "Pago de venta #{$sale->receipt_number} - {$paymentMethod->name}",
                            'reference' => $sale->receipt_number,
                            'sale_id' => $sale->id,
                            'metadata' => [
                                'sale_id' => $sale->id,
                                'receipt_number' => $sale->receipt_number,
                                'payment_id' => $payment->id, // ID único del pago para distinguir pagos múltiples
                                'payment_method' => $paymentMethod->name,
                                'payment_method_id' => $payment->payment_method_id,
                                'payment_amount' => $paymentAmount
                            ]
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            throw new \Exception('Error al registrar movimientos en cuenta corriente: ' . $e->getMessage());
        }
    }


    public function getAllSales(Request $request): SupportCollection
    {
        $query = SaleHeader::with([
            'receiptType',
            'branch',
            'customer.person',
            'user.person',
            'saleFiscalCondition',
            'saleDocumentType',
            'items.product',
            'saleIvas',
            'convertedFromBudget',
            'convertedToSale',
        ]);

        // Manejar filtro por sucursales (array o valor único)
        if ($request->has('branch_id')) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        $from = $request->input('from_date') ?? $request->input('from');
        $to = $request->input('to_date') ?? $request->input('to');
        if ($from) {
            $query->where('date', '>=', Carbon::parse($from)->startOfDay()->setTimezone('UTC'));
        }
        if ($to) {
            $query->where('date', '<=', Carbon::parse($to)->endOfDay()->setTimezone('UTC'));
        }
        $sales = $query->orderByDesc('date')->get();
        return $sales->map(function ($sale) {
            $customerName = '';
            if ($sale->customer && $sale->customer->person) {
                $customerName = trim($sale->customer->person->first_name . ' ' . $sale->customer->person->last_name);
            } elseif ($sale->customer && $sale->customer->business_name) {
                $customerName = $sale->customer->business_name;
            } else {
                $customerName = 'N/A';
            }

            // Preparar información del vendedor
            $sellerName = '';
            if ($sale->user && $sale->user->person) {
                $sellerName = trim($sale->user->person->first_name . ' ' . $sale->user->person->last_name);
            } elseif ($sale->user && $sale->user->username) {
                $sellerName = $sale->user->username;
            } else {
                $sellerName = 'N/A';
            }

            $receiptTypeName = $sale->receiptType ? $sale->receiptType->description : 'N/A';
            $receiptTypeCode = $sale->receiptType ? $sale->receiptType->afip_code ?? '' : '';
            $receiptNumber = $sale->receipt_number ?? '';
            $items = $sale->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'product' => $item->product,
                    'unit_price' => $item->unit_price,
                    'iva_rate' => $item->iva_rate,
                    'item_subtotal' => $item->item_subtotal,
                    'item_iva' => $item->item_iva,
                    'item_total' => $item->item_total,
                ];
            });
            $itemsCount = $items->count();
            $dateIso = $sale->date ? Carbon::parse($sale->date)->format('Y-m-d H:i:s') : '';
            $dateDisplay = $sale->date ? Carbon::parse($sale->date)->format('d/m/Y H:i') : '';
            return [
                'id' => $sale->id,
                'date' => $dateIso,
                'date_display' => $dateDisplay,
                'receipt_type_id' => $sale->receipt_type_id,
                'receipt_type' => $receiptTypeName,
                'receipt_type_code' => $receiptTypeCode,
                'receipt_number' => $receiptNumber,
                'customer' => $customerName,
                'customer_id' => $sale->customer_id,
                'seller' => $sellerName,
                'seller_id' => $sale->user_id,
                'items_count' => $itemsCount,
                'cae' => $sale->cae,
                'cae_expiration_date' => $sale->cae_expiration_date ? Carbon::parse($sale->cae_expiration_date)->format('Y-m-d') : '',
                'subtotal' => (float) $sale->subtotal,
                'total' => (float) $sale->total,
                'total_iva_amount' => (float) $sale->total_iva_amount,
                'status' => $sale->status ?? ($sale->receiptType && strtoupper($sale->receiptType->code) === 'PRE' ? 'Presupuesto' : 'Completada'),
                'branch' => $sale->branch ? $sale->branch->description : '',
                'items' => $items,
                'converted_from_budget_id' => $sale->converted_from_budget_id,
                'converted_from_budget_receipt' => $sale->convertedFromBudget ? $sale->convertedFromBudget->receipt_number : null,
            ];
        });
    }

    public function getSaleById(int $id): ?SaleHeader
    {
        return SaleHeader::with([
            'receiptType',
            'branch',
            'customer.person',
            'customer.taxIdentities.fiscalCondition',
            'customerTaxIdentity.fiscalCondition',
            'user.person',
            'saleFiscalCondition',
            'saleDocumentType',
            'items.product.iva',
            'saleIvas.iva',
            'salePayments.paymentMethod',
            'convertedToSale',
            'convertedFromBudget',
        ])->find($id);
    }

    public function calculateTotalsForSaleHeader($saleHeader)
    {
        $subtotal = 0;
        $totalIva = 0;
        $items = $saleHeader->items()->with('product.iva')->get();

        foreach ($items as $item) {
            $unitPrice = $item->unit_price;
            $ivaRate = $item->iva_rate;
            $itemSubtotal = $unitPrice * $item->quantity;
            $itemIva = $itemSubtotal * ($ivaRate / 100);
            $subtotal += $itemSubtotal;
            $totalIva += $itemIva;
        }
        $saleHeader->subtotal = $subtotal;
        $saleHeader->total_iva_amount = $totalIva;
        $saleHeader->total = $subtotal + $totalIva;
        $saleHeader->save();
    }

    public function updateSale(int $id, array $data): ?SaleHeader
    {
        $sale = SaleHeader::find($id);
        if (!$sale) {
            return null;
        }

        $itemsData = $data['items'] ?? null;
        unset($data['items']);

        if (isset($data['date'])) {
            $data['date'] = Carbon::parse($data['date']);
        }

        // Si se actualiza la identidad fiscal del cliente, sincronizar CUIT y condición fiscal
        if (!empty($data['customer_tax_identity_id'])) {
            $chosenIdentity = \App\Models\CustomerTaxIdentity::where('id', $data['customer_tax_identity_id'])
                ->where('customer_id', $sale->customer_id)
                ->first();
            if ($chosenIdentity) {
                $data['sale_fiscal_condition_id'] = (int) $chosenIdentity->fiscal_condition_id;
                $data['sale_document_number'] = $chosenIdentity->cuit
                    ? preg_replace('/[^0-9]/', '', (string) $chosenIdentity->cuit)
                    : ($data['sale_document_number'] ?? $sale->sale_document_number);
            }
        }

        $sale->update($data);

        if ($itemsData !== null) {
            $sale->items()->delete();
            $sale->saleIvas()->delete();

            $this->calculateTotalsForSaleHeader($sale->fresh('items'));
        }

        return $sale->fresh([
            'receiptType',
            'branch',
            'customer.person',
            'user',
            'saleFiscalCondition',
            'saleDocumentType',
            'items.product.iva',
            'saleIvas.iva'
        ]);
    }

    public function deleteSale(int $id): bool
    {
        $sale = SaleHeader::find($id);
        if ($sale) {
            return $sale->delete();
        }
        return false;
    }

    public function getSalesTotalByBranchAndDate(int $branchId, string $from, string $to): float
    {
        $sales = SaleHeader::with('receiptType')
            ->where('branch_id', $branchId)
            ->whereDate('date', '>=', Carbon::parse($from)->startOfDay())
            ->whereDate('date', '<=', Carbon::parse($to)->endOfDay())
            ->get();

        return (float) $sales->filter(function ($sale) {
            return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
        })->sum('total');
    }

    /**
     * Helper method to check if a sale is a budget (presupuesto)
     */
    private function isBudgetSale($sale): bool
    {
        return $sale->receiptType && AfipConstants::isPresupuesto($sale->receiptType->afip_code);
    }

    public function getSalesSummary(Request $request): array
    {
        $branchIds = $request->input('branch_id');
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');

        $query = SaleHeader::with('receiptType');

        // Manejar filtro por sucursales (array o valor único)
        if ($branchIds) {
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }
        if ($fromInput && $toInput) {
            $from = Carbon::parse($fromInput)->startOfDay();
            $to = Carbon::parse($toInput)->endOfDay();
            $query->whereBetween('date', [$from, $to]);
        } elseif ($fromInput) {
            $from = Carbon::parse($fromInput)->startOfDay();
            $query->where('date', '>=', $from);
        } elseif ($toInput) {
            $to = Carbon::parse($toInput)->endOfDay();
            $query->where('date', '<=', $to);
        }

        $allSalesInPeriod = $query->get();

        $financialSales = $allSalesInPeriod->filter(function ($sale) {
            return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
        });

        $sales_count = $financialSales->count();
        $grand_total_amount = $financialSales->sum('total');
        $grand_total_iva = $financialSales->sum('total_iva_amount');
        $average_sale_amount = $sales_count > 0 ? $grand_total_amount / $sales_count : 0;

        $budget_count = $allSalesInPeriod->filter(function ($sale) {
            return $this->isBudgetSale($sale);
        })->count();
        $client_count = $allSalesInPeriod->whereNotNull('customer_id')->pluck('customer_id')->unique()->count();

        return [
            'sales_count' => $sales_count,
            'grand_total_amount' => (float) $grand_total_amount,
            'grand_total_iva' => (float) $grand_total_iva,
            'average_sale_amount' => (float) $average_sale_amount,
            'budget_count' => $budget_count,
            'client_count' => $client_count,
        ];
    }

    /**
     * Generate PDF for sale (ticket térmico o factura A4).
     * Para comprobantes AFIP (no Presupuesto ni Factura X) usa el SDK para HTML + QR;
     * para Presupuesto/Factura X usa las plantillas Blade locales.
     */
    public function downloadPdf(int $id, string $format = 'standard')
    {
        $sale = SaleHeader::with([
            'items.product.iva',
            'branch',
            'customer.person',
            'customerTaxIdentity.fiscalCondition',
            'receiptType',
            'saleIvas.iva',
            'saleFiscalCondition',
            'paymentType',
        ])->findOrFail($id);

        $afipCode = $sale->receiptType->afip_code ?? null;
        $useSdk = !AfipConstants::isInternalOnlyReceipt($afipCode);

        if ($useSdk) {
            return $this->downloadPdfViaSdk($sale, $format);
        }

        return $this->downloadPdfViaBlade($sale, $format);
    }

    /**
     * Genera el PDF usando plantillas Blade (Presupuesto y Factura X).
     */
    private function downloadPdfViaBlade(SaleHeader $sale, string $format): \Illuminate\Http\Response
    {
        $template = $format === 'thermal' ? 'pdf.ticket' : 'pdf.sale';
        $pdf = Pdf::loadView($template, ['sale' => $sale]);

        return $pdf->download($this->pdfFilename($sale));
    }

    /**
     * Genera el PDF usando el SDK AFIP (HTML con QR) para comprobantes autorizados por AFIP.
     * Aplica las medidas de referencia: ticket 80mm, factura A4.
     */
    private function downloadPdfViaSdk(SaleHeader $sale, string $format): \Illuminate\Http\Response
    {
        $invoice = $this->buildInvoiceDataForSdk($sale);
        $responseArray = $this->buildAfipResponseFromSale($sale);
        $normalizedArray = $this->normalizeArrayForInvoiceResponse($responseArray);
        $response = InvoiceResponse::fromArray($normalizedArray);

        $isThermal = $format === 'thermal';
        $html = $isThermal
            ? Afip::renderTicketHtml($invoice, $response)
            : Afip::renderFacturaA4Html($invoice, $response);

        $pdf = Pdf::loadHtml($html);
        $pdf->setOption('enable_remote', true);

        // NO forzar setPaper para ticket - dejar que use el @page del CSS (igual que Blade)
        // Solo forzar A4 para factura standard
        if (!$isThermal) {
            $pdf->setPaper('a4', 'portrait');
        }

        return $pdf->download($this->pdfFilename($sale));
    }

    /**
     * Nombre base del archivo PDF.
     */
    private function pdfFilename(SaleHeader $sale): string
    {
        return 'comprobante_' . $sale->receipt_number . '_' . $sale->id . '.pdf';
    }

    /**
     * Devuelve el HTML de vista previa del comprobante (ticket o factura A4) generado por el SDK.
     * Solo para comprobantes AFIP (no Presupuesto ni Factura X). Para internos devuelve null.
     *
     * @return array{html: string, format: string}|null null si es comprobante interno
     */
    public function getReceiptPreviewHtml(int $saleId, string $format = 'standard'): ?array
    {
        $sale = SaleHeader::with([
            'items.product.iva',
            'branch',
            'customer.person',
            'customerTaxIdentity.fiscalCondition',
            'receiptType',
            'saleIvas.iva',
            'saleFiscalCondition',
            'paymentType',
        ])->find($saleId);

        if (!$sale) {
            return null;
        }

        $afipCode = $sale->receiptType->afip_code ?? null;
        if (AfipConstants::isInternalOnlyReceipt($afipCode)) {
            return null;
        }

        // Check for CAE existence in Preview too
        if (empty($sale->cae)) {
            // In preview we might return null or a placeholder, but for consistency let's log
            Log::warning("Preview de PDF sin CAE. Venta ID: {$sale->id}");
            // We continue, but it might show empty. OR we can throw exception?
            // Preview is mostly UI, maybe better to show what we have.
        }

        $invoice = $this->buildInvoiceDataForSdk($sale);
        // Ensure codAut is explicitly present
        if (!empty($sale->cae) && empty($invoice['codAut'])) {
            $invoice['codAut'] = (string) $sale->cae;
        }

        $responseArray = $this->buildAfipResponseFromSale($sale);
        $normalizedArray = $this->normalizeArrayForInvoiceResponse($responseArray);
        $response = InvoiceResponse::fromArray($normalizedArray);

        $isThermal = $format === 'thermal';
        $html = $isThermal
            ? Afip::renderTicketHtml($invoice, $response)
            : Afip::renderFacturaA4Html($invoice, $response);

        return [
            'html' => $html,
            'format' => $isThermal ? 'thermal' : 'standard',
        ];
    }

    public function getSalesHistoryByBranch(int $branchId, Request $request): array
    {
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');
        $period = $request->input('period', 'month');
        $groupBy = $request->input('group_by', 'day');

        $query = SaleHeader::with('receiptType')->where('branch_id', $branchId);

        if ($fromInput && $toInput) {
            $from = Carbon::parse($fromInput)->startOfDay();
            $to = Carbon::parse($toInput)->endOfDay();
            $query->whereBetween('date', [$from, $to]);
        } elseif ($fromInput) {
            $from = Carbon::parse($fromInput)->startOfDay();
            $query->where('date', '>=', $from);
            $to = Carbon::now()->endOfDay();
        } elseif ($toInput) {
            $to = Carbon::parse($toInput)->endOfDay();
            $query->where('date', '<=', $to);
            $from = Carbon::now()->subMonthNoOverflow()->startOfDay();
        } else {
            $to = Carbon::now()->endOfDay();
            if ($period === 'month') {
                $from = Carbon::now()->subYear()->startOfDay();
            } elseif ($period === 'week') {
                $from = Carbon::now()->subWeek()->startOfDay();
            } elseif ($period === 'year') {
                $from = Carbon::now()->subYear()->startOfDay();
            } else {
                $from = Carbon::now()->subYear()->startOfDay();
            }
            $query->whereBetween('date', [$from, $to]);
        }

        $sales = $query->get();

        // Filtrar presupuestos y ventas anuladas
        $financialSales = $sales->filter(function ($sale) {
            return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
        });

        if ($groupBy === 'month') {
            $dateFormat = "DATE_FORMAT(date, '%Y-%m')";
        } else {
            $dateFormat = "DATE(date)";
        }

        $salesData = $financialSales->groupBy(function ($sale) use ($dateFormat, $groupBy) {
            return $sale->date->format($groupBy === 'month' ? 'Y-m' : 'Y-m-d');
        })->map(function ($group) use ($groupBy) {
            return [
                'sale_date' => $group->first()->date->format($groupBy === 'month' ? 'Y-m' : 'Y-m-d'),
                'total_sales' => $group->sum('total')
            ];
        })->values();

        $allDates = [];
        $labels = [];
        $data = [];

        if ($groupBy === 'month') {
            $current = Carbon::parse($from)->startOfMonth();
            $end = Carbon::parse($to)->endOfMonth();

            while ($current <= $end) {
                $dateKey = $current->format('Y-m');
                $allDates[$dateKey] = 0;
                $current->addMonth();
            }
        } else {
            $current = Carbon::parse($from)->startOfDay();
            $end = Carbon::parse($to)->endOfDay();

            while ($current <= $end) {
                $dateKey = $current->format('Y-m-d');
                $allDates[$dateKey] = 0;
                $current->addDay();
            }
        }

        foreach ($salesData as $sale) {
            $allDates[$sale['sale_date']] = (float) $sale['total_sales'];
        }

        foreach ($allDates as $date => $amount) {
            if ($groupBy === 'month') {
                $labels[] = Carbon::parse($date . '-01')->format('M Y');
            } else {
                $labels[] = Carbon::parse($date)->format('d/m');
            }
            $data[] = $amount;
        }

        return [
            'labels' => $labels,
            'datasets' => [
                [
                    'label' => 'Ventas',
                    'data' => $data,
                    'backgroundColor' => 'rgba(75, 192, 192, 0.5)',
                    'borderColor' => 'rgba(75, 192, 192, 1)',
                ],
            ],
        ];
    }

    public function getSalesSummaryAllBranches(Request $request): array
    {
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');

        $baseQuery = SaleHeader::query();
        if ($fromInput) {
            $baseQuery->whereDate('date', '>=', Carbon::parse($fromInput)->startOfDay());
        }
        if ($toInput) {
            $baseQuery->whereDate('date', '<=', Carbon::parse($toInput)->endOfDay());
        }

        $allSalesInPeriod = $baseQuery->with(['branch', 'receiptType'])->get();

        $summaries = [];
        $salesByBranch = $allSalesInPeriod->groupBy('branch_id');

        foreach ($salesByBranch as $branchId => $salesInBranch) {
            if (is_null($branchId))
                continue;

            $branch = $salesInBranch->first()->branch;

            $financialSales = $salesInBranch->filter(function ($sale) {
                return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
            });

            $sales_count = $financialSales->count();
            $grand_total_amount = $financialSales->sum('total');
            $grand_total_iva = $financialSales->sum('total_iva_amount');
            $average_sale_amount = $sales_count > 0 ? $grand_total_amount / $sales_count : 0;

            $budget_count = $salesInBranch->filter(function ($sale) {
                return $this->isBudgetSale($sale);
            })->count();
            $client_count = $salesInBranch->whereNotNull('customer_id')->pluck('customer_id')->unique()->count();

            $summaries[] = [
                'branch_id' => $branchId,
                'branch_name' => $branch ? $branch->description : 'Desconocida',
                'sales_count' => $sales_count,
                'grand_total_amount' => (float) $grand_total_amount,
                'grand_total_iva' => (float) $grand_total_iva,
                'average_sale_amount' => (float) $average_sale_amount,
                'budget_count' => $budget_count,
                'client_count' => $client_count,
            ];
        }
        return $summaries;
    }

    public function getAllSalesGlobal(Request $request)
    {
        $query = SaleHeader::with([
            'receiptType',
            'branch',
            'customer.person',
            'user.person',
            'items',
            'convertedToSale',
            'convertedFromBudget',
        ]);

        // Detectar si la búsqueda es principalmente por número de venta
        $isSearchingByNumber = false;
        if ($request->has('search') && $request->input('search')) {
            $searchTerm = trim($request->input('search'));
            // Si el término de búsqueda es principalmente numérico, asumimos que es búsqueda por número
            // Permitimos algunos caracteres no numéricos pero la mayoría deben ser números
            $numericChars = preg_match_all('/\d/', $searchTerm);
            $totalChars = mb_strlen($searchTerm);
            $isSearchingByNumber = $totalChars > 0 && ($numericChars / $totalChars) >= 0.7;
        }

        // Solo aplicar filtros de fechas si NO estamos buscando por número
        if (!$isSearchingByNumber) {
            if ($request->has('from_date') && $request->input('from_date')) {
                $query->whereDate('date', '>=', Carbon::parse($request->input('from_date'))->startOfDay());
            }
            if ($request->has('to_date') && $request->input('to_date')) {
                $query->whereDate('date', '<=', Carbon::parse($request->input('to_date'))->endOfDay());
            }
        }

        if ($request->has('branch_id') && $request->input('branch_id')) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        if ($request->has('search') && $request->input('search')) {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('receipt_number', 'like', "%{$searchTerm}%")
                    ->orWhereHas('customer.person', function ($qr) use ($searchTerm) {
                        $qr->where('first_name', 'like', "%{$searchTerm}%")
                            ->orWhere('last_name', 'like', "%{$searchTerm}%")
                            ->orWhere('phone', 'like', "%{$searchTerm}%")
                            ->orWhere('documento', 'like', "%{$searchTerm}%")
                            ->orWhere('cuit', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('branch', function ($qr) use ($searchTerm) {
                        $qr->where('description', 'like', "%{$searchTerm}%");
                    });
            });
        }

        $salesPaginator = null;
        if ($request->input('paginate', 'true') === 'false') {
            $salesCollection = $query->orderByDesc('date')->get();
        } else {
            $perPage = $request->input('per_page', 15);
            $salesPaginator = $query->orderByDesc('date')->paginate($perPage);
            $salesCollection = $salesPaginator->getCollection();
        }

        $mappedSales = $salesCollection->map(function ($sale) {
            $customerName = '';
            if ($sale->customer && $sale->customer->person) {
                $customerName = trim($sale->customer->person->first_name . ' ' . $sale->customer->person->last_name);
            } elseif ($sale->customer && $sale->customer->business_name) {
                $customerName = $sale->customer->business_name;
            } else {
                $customerName = 'Consumidor Final';
            }

            // Preparar información del vendedor
            $sellerName = '';
            if ($sale->user && $sale->user->person) {
                $sellerName = trim($sale->user->person->first_name . ' ' . $sale->user->person->last_name);
            } elseif ($sale->user && $sale->user->username) {
                $sellerName = $sale->user->username;
            } else {
                $sellerName = 'N/A';
            }

            $receiptTypeName = $sale->receiptType ? $sale->receiptType->description : 'N/A';
            $receiptTypeCode = $sale->receiptType ? $sale->receiptType->afip_code ?? '' : '';

            $itemsCount = $sale->items->count();

            $dateIso = $sale->date ? Carbon::parse($sale->date)->format('Y-m-d H:i:s') : '';
            $dateDisplay = $sale->date ? Carbon::parse($sale->date)->format('d/m/Y H:i') : '';

            return [
                'id' => $sale->id,
                'date' => $dateIso,
                'date_display' => $dateDisplay,
                'receipt_type_id' => $sale->receipt_type_id,
                'receipt_type' => $receiptTypeName,
                'receipt_type_code' => $receiptTypeCode,
                'receipt_number' => $sale->receipt_number ?? '',
                'customer' => $customerName,
                'customer_id' => $sale->customer_id,
                'seller' => $sellerName,
                'seller_id' => $sale->user_id,
                'items_count' => $itemsCount,
                'cae' => $sale->cae,
                'cae_expiration_date' => $sale->cae_expiration_date ? Carbon::parse($sale->cae_expiration_date)->format('Y-m-d') : '',
                'subtotal' => (float) $sale->subtotal,
                'total' => (float) $sale->total,
                'total_iva_amount' => (float) $sale->total_iva_amount,
                'converted_from_budget_id' => $sale->converted_from_budget_id,
                'converted_from_budget_receipt' => $sale->convertedFromBudget ? $sale->convertedFromBudget->receipt_number : null,
                'status' => $sale->status ?? ($sale->receiptType && strtoupper($sale->receiptType->code) === 'PRE' ? 'Presupuesto' : 'Completada'),
                'annulled_at' => $sale->annulled_at ? Carbon::parse($sale->annulled_at)->format('Y-m-d H:i:s') : null,
                'annulled_by' => $sale->annulled_by,
                'annulment_reason' => $sale->annulment_reason,
                'branch' => $sale->branch ? $sale->branch->description : 'N/A',
                'converted_to_sale_id' => $sale->converted_to_sale_id,
                'converted_to_sale_receipt' => $sale->convertedToSale ? $sale->convertedToSale->receipt_number : null,
                'converted_at' => $sale->converted_at ? Carbon::parse($sale->converted_at)->format('Y-m-d H:i:s') : null,
            ];
        });

        if ($salesPaginator) {
            return new LengthAwarePaginator(
                $mappedSales,
                $salesPaginator->total(),
                $salesPaginator->perPage(),
                $salesPaginator->currentPage(),
                ['path' => $request->url(), 'query' => $request->query()]
            );
        }
        return $mappedSales;
    }

    public function getSalesSummaryGlobal(Request $request): array
    {
        $query = SaleHeader::query();

        if ($request->has('from_date') && $request->input('from_date')) {
            $query->whereDate('date', '>=', Carbon::parse($request->input('from_date'))->startOfDay());
        }
        if ($request->has('to_date') && $request->input('to_date')) {
            $query->whereDate('date', '<=', Carbon::parse($request->input('to_date'))->endOfDay());
        }
        if ($request->has('branch_id') && $request->input('branch_id')) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        $allSalesInPeriod = $query->with('receiptType')->get();

        $financialSales = $allSalesInPeriod->filter(function ($sale) {
            return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
        });

        $sales_count = $financialSales->count();
        $grand_total_amount = $financialSales->sum('total');
        $grand_total_iva = $financialSales->sum('total_iva_amount');
        $average_sale_amount = $sales_count > 0 ? (float) ($grand_total_amount / $sales_count) : 0;

        $budget_count = $allSalesInPeriod->filter(function ($sale) {
            return $this->isBudgetSale($sale);
        })->count();

        $converted_budget_count = $allSalesInPeriod->filter(function ($sale) {
            return $this->isBudgetSale($sale) && $sale->converted_to_sale_id !== null;
        })->count();

        $client_count = $allSalesInPeriod->whereNotNull('customer_id')->pluck('customer_id')->unique()->count();

        return [
            'sales_count' => $sales_count,
            'grand_total_amount' => (float) $grand_total_amount,
            'grand_total_iva' => (float) $grand_total_iva,
            'average_sale_amount' => $average_sale_amount,
            'budget_count' => $budget_count,
            'converted_budget_count' => $converted_budget_count,
            'client_count' => $client_count,
        ];
    }

    public function getSalesHistoryGlobal(Request $request): array
    {
        $period = $request->input('period', 'month');
        $endDate = Carbon::now()->endOfDay();
        $startDate = Carbon::now()->startOfDay();

        if ($period === 'month') {
            $startDate = Carbon::now()->subMonthNoOverflow()->startOfDay();
        } elseif ($period === 'week') {
            $startDate = Carbon::now()->subWeek()->startOfDay();
        } elseif ($period === 'year') {
            $startDate = Carbon::now()->subYearNoOverflow()->startOfDay();
        }
        if ($request->has('from_date') && $request->input('from_date')) {
            $startDate = Carbon::parse($request->input('from_date'))->startOfDay();
        }
        if ($request->has('to_date') && $request->input('to_date')) {
            $endDate = Carbon::parse($request->input('to_date'))->endOfDay();
        }

        $salesQuery = SaleHeader::with('receiptType')
            ->whereBetween('date', [$startDate, $endDate]);

        if ($request->has('branch_id') && $request->input('branch_id')) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $salesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $salesQuery->where('branch_id', $branchIds);
            }
        }

        $sales = $salesQuery->get();

        // Filtrar presupuestos y ventas anuladas
        $financialSales = $sales->filter(function ($sale) {
            return !$this->isBudgetSale($sale) && $sale->status !== 'annulled';
        });

        $salesData = $financialSales->groupBy(function ($sale) {
            return $sale->date->format('Y-m-d');
        })->map(function ($group) {
            return [
                'sale_date' => $group->first()->date->format('Y-m-d'),
                'total_sales' => $group->sum('total')
            ];
        })->values();

        $labels = $salesData->pluck('sale_date')->map(function ($date) {
            return Carbon::parse($date)->format('d/m');
        });

        $data = $salesData->pluck('total_sales');

        return [
            'labels' => $labels,
            'datasets' => [
                [
                    'label' => 'Ventas Globales',
                    'data' => $data,
                    'backgroundColor' => 'rgba(54, 162, 235, 0.5)',
                    'borderColor' => 'rgba(54, 162, 235, 1)',
                ],
            ],
        ];
    }

    /**
     * Resolver MovementType por método de pago (efectivo, transferencia, tarjetas, MP, etc.)
     */
    private function resolveMovementTypeForPaymentMethod(?\App\Models\PaymentMethod $paymentMethod): ?\App\Models\MovementType
    {
        try {
            if (!$paymentMethod) {
                return null;
            }
            $name = strtolower(trim($paymentMethod->name ?? ''));
            if ($name === '') {
                return null;
            }

            // Determinar nombre/desc canónicos por método de pago
            $canonicalName = null;
            $canonicalDesc = null;

            if (str_contains($name, 'efectivo')) {
                $canonicalName = 'Venta en efectivo';
                $canonicalDesc = 'Ingreso por venta en efectivo';
            } elseif (str_contains($name, 'transfer')) { // transferencia
                $canonicalName = 'Venta por transferencia';
                $canonicalDesc = 'Ingreso por venta realizada por transferencia';
            } elseif (str_contains($name, 'debito') || str_contains($name, 'débito')) {
                $canonicalName = 'Venta con tarjeta de débito';
                $canonicalDesc = 'Ingreso por venta pagada con tarjeta de débito';
            } elseif (str_contains($name, 'credito') || str_contains($name, 'crédito')) {
                // Solo para tarjetas de crédito
                $canonicalName = 'Venta con tarjeta de crédito';
                $canonicalDesc = 'Ingreso por venta pagada con tarjeta de crédito';
            } elseif (str_contains($name, 'tarjeta')) {
                $canonicalName = 'Venta con tarjeta';
                $canonicalDesc = 'Ingreso por venta pagada con tarjeta';
            } elseif (str_contains($name, 'mercado') || preg_match('/\bmp\b/', $name)) {
                $canonicalName = 'Venta por Mercado Pago';
                $canonicalDesc = 'Ingreso por venta cobrada por Mercado Pago';
            } elseif (str_contains($name, 'cheque')) {
                $canonicalName = 'Venta por cheque';
                $canonicalDesc = 'Ingreso por venta cobrada con cheque';
            }

            if ($canonicalName) {
                // Buscar o crear el tipo con flags correctos
                return \App\Models\MovementType::firstOrCreate(
                    ['name' => $canonicalName, 'operation_type' => 'entrada'],
                    [
                        'description' => $canonicalDesc,
                        'is_cash_movement' => true,
                        'is_current_account_movement' => false,
                        'active' => true,
                    ]
                );
            }
        } catch (\Throwable $t) {
            // ignorar y permitir fallback
        }
        return null;
    }

    /**
     * Autoriza una venta con AFIP
     * 
     * @param SaleHeader $sale La venta a autorizar
     * @return array Datos de la autorización (cae, cae_expiration_date, invoice_number, etc.)
     * @throws \Exception Si hay errores en la autorización
     */
    public function authorizeWithAfip(SaleHeader $sale): array
    {
        try {
            // Cargar relaciones necesarias
            $sale->load([
                'receiptType',
                'customer.person',
                'customerTaxIdentity',
                'items.product.iva',
                'saleIvas.iva',
                'branch',
            ]);

            if ($sale->receiptType && AfipConstants::isInternalOnlyReceipt($sale->receiptType->afip_code ?? null)) {
                throw new \Exception(
                    AfipConstants::isFacturaX($sale->receiptType->afip_code ?? null)
                    ? 'La Factura X es solo de uso interno del sistema y no se autoriza con AFIP'
                    : 'Los presupuestos no se pueden autorizar con AFIP'
                );
            }

            $receiptAfipCode = $sale->receiptType->afip_code ?? null;
            $requiresCuit = AfipConstants::receiptRequiresCuit($receiptAfipCode);
            if ($requiresCuit && (!$sale->customer || !$sale->customer->person)) {
                throw new \Exception('La Factura A requiere un cliente con CUIT asociado');
            }
            if ($requiresCuit && $sale->customer && $sale->customer->person) {
                if (!AfipConstants::isValidCuit($sale->customer->person->cuit ?? null)) {
                    throw new \Exception('El cliente debe tener un CUIT válido de 11 dígitos para Factura A');
                }
            }

            // Obtener CUIT del contribuyente (sucursal o global)
            $taxpayerCuit = null;
            if ($sale->branch && !empty($sale->branch->cuit)) {
                $taxpayerCuit = preg_replace('/[^0-9]/', '', $sale->branch->cuit);
                if (strlen($taxpayerCuit) !== 11) {
                    Log::warning('CUIT de sucursal inválido, usando configuración global', [
                        'branch_id' => $sale->branch->id,
                        'cuit' => $sale->branch->cuit,
                    ]);
                    $taxpayerCuit = null;
                }
            }

            // Preparar datos de la factura para AFIP
            $invoiceData = $this->prepareInvoiceDataForAfip($sale);

            Log::info('Payload enviado a AFIP para autorizar comprobante', [
                'sale_id' => $sale->id,
                'payload_json' => json_encode($invoiceData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ]);

            // Autorizar con AFIP
            $result = $taxpayerCuit
                ? \Resguar\AfipSdk\Facades\Afip::authorizeInvoice($invoiceData, $taxpayerCuit)
                : \Resguar\AfipSdk\Facades\Afip::authorizeInvoice($invoiceData);

            // Convertir a array si es objeto (InvoiceResponse usa toArray() con snake_case)
            $rawResult = is_array($result)
                ? $result
                : (method_exists($result, 'toArray')
                    ? $result->toArray()
                    : (array) $result);

            Log::debug('Respuesta cruda de AFIP authorizeInvoice', [
                'sale_id' => $sale->id,
                'raw_response' => $rawResult,
            ]);

            // Normalizar respuesta: el SDK puede devolver camelCase, snake_case o claves AFIP (CAE, CAEFchVto, CbteDesde, PtoVta, CbteTipo)
            $resultArray = $this->normalizeAfipAuthorizationResponse($rawResult);

            // VALIDACIÓN DE CAE: Si no hay CAE, la autorización falló (o fue rechazada)
            if (empty($resultArray['cae'])) {
                $errorMsg = 'AFIP no devolvió CAE (Comprobante rechazado o error).';

                // Intentar extraer observaciones (Obs) de la respuesta cruda para dar más detalle
                $observations = null;
                if (isset($rawResult['FeDetResp']['FECAEDetResponse']['Observaciones']['Obs'])) {
                    $observations = $rawResult['FeDetResp']['FECAEDetResponse']['Observaciones']['Obs'];
                } elseif (isset($rawResult['FeDetResp'][0]['Observaciones']['Obs'])) {
                    $observations = $rawResult['FeDetResp'][0]['Observaciones']['Obs'];
                } elseif (isset($rawResult['Observaciones']['Obs'])) {
                    $observations = $rawResult['Observaciones']['Obs'];
                }

                if ($observations) {
                    // Puede ser un array de obs o una sola obs
                    if (isset($observations['Msg'])) {
                        $errorMsg .= " Detalle: {$observations['Msg']} (Cod: {$observations['Code']})";
                    } elseif (is_array($observations)) {
                        foreach ($observations as $obs) {
                            if (isset($obs['Msg'])) {
                                $errorMsg .= " [{$obs['Msg']}]";
                            }
                        }
                    }
                }

                // Intentar extraer Errores (Errors)
                if (isset($rawResult['Errors']['Err'])) {
                    $errs = $rawResult['Errors']['Err'];
                    if (isset($errs['Msg'])) {
                        $errorMsg .= " Error: {$errs['Msg']}";
                    } elseif (is_array($errs)) {
                        foreach ($errs as $e) {
                            if (isset($e['Msg'])) {
                                $errorMsg .= " [Error: {$e['Msg']}]";
                            }
                        }
                    }
                }

                Log::error('AFIP AuthorizeInvoice falló: CAE vacío', [
                    'sale_id' => $sale->id,
                    'raw_response' => $rawResult
                ]);

                throw new \Exception($errorMsg);
            }

            // Asegurar vto CAE: si la normalización no lo trajo, leer del objeto (InvoiceResponse->caeExpirationDate)
            if (empty($resultArray['caeExpirationDate']) && is_object($result) && property_exists($result, 'caeExpirationDate')) {
                $v = $result->caeExpirationDate ?? null;
                if ($v !== null && $v !== '') {
                    $resultArray['caeExpirationDate'] = (string) $v;
                }
            }

            // Guardar en base de datos (cae_expiration_date viene de AFIP en la respuesta de autorización)
            DB::transaction(function () use ($sale, $resultArray) {
                $caeExpiration = $resultArray['caeExpirationDate'] ?? null;
                $invoiceNumber = $resultArray['invoiceNumber'] ?? null;

                $updateData = [
                    'cae' => $resultArray['cae'] ?? null,
                    'cae_expiration_date' => $caeExpiration
                        ? (is_string($caeExpiration) && strlen($caeExpiration) === 8
                            ? Carbon::createFromFormat('Ymd', $caeExpiration)
                            : Carbon::parse($caeExpiration))
                        : null,
                ];

                // Actualizar receipt_number solo si AFIP devolvió uno y no genera duplicado (unique: branch_id, receipt_type_id, receipt_number)
                if ($invoiceNumber !== null && $invoiceNumber !== '') {
                    $newReceiptNumber = str_pad((string) $invoiceNumber, AfipConstants::RECEIPT_NUMBER_PADDING, '0', STR_PAD_LEFT);
                    $duplicateExists = SaleHeader::where('branch_id', $sale->branch_id)
                        ->where('numbering_scope', $sale->numbering_scope)
                        ->where('receipt_number', $newReceiptNumber)
                        ->where('id', '!=', $sale->id)
                        ->exists();
                    if (!$duplicateExists) {
                        $updateData['receipt_number'] = $newReceiptNumber;
                    } else {
                        Log::warning('Autorización AFIP: número de comprobante devuelto ya existe para otra venta, se mantiene el actual', [
                            'sale_id' => $sale->id,
                            'afip_invoice_number' => $invoiceNumber,
                            'current_receipt_number' => $sale->receipt_number,
                        ]);
                    }
                }

                $sale->update($updateData);
            });

            Log::info('Venta autorizada con AFIP exitosamente', [
                'sale_id' => $sale->id,
                'receipt_number' => $sale->receipt_number,
                'cae' => $resultArray['cae'] ?? null,
                'invoice_number' => $resultArray['invoiceNumber'] ?? null,
            ]);

            $caeExpirationForReturn = $resultArray['caeExpirationDate'] ?? null;
            $caeExpirationFormatted = null;
            if ($caeExpirationForReturn) {
                try {
                    $dt = is_string($caeExpirationForReturn) && strlen($caeExpirationForReturn) === 8
                        ? Carbon::createFromFormat('Ymd', $caeExpirationForReturn)
                        : Carbon::parse($caeExpirationForReturn);
                    $caeExpirationFormatted = $dt->format('Y-m-d');
                } catch (\Throwable $e) {
                    // ignorar
                }
            }

            return [
                'cae' => $resultArray['cae'] ?? null,
                'cae_expiration_date' => $caeExpirationFormatted,
                'invoice_number' => $resultArray['invoiceNumber'] ?? null,
                'point_of_sale' => $resultArray['pointOfSale'] ?? null,
                'invoice_type' => $resultArray['invoiceType'] ?? null,
            ];

        } catch (\Resguar\AfipSdk\Exceptions\AfipException $e) {
            Log::error('Error de AFIP al autorizar venta', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
                'afip_code' => method_exists($e, 'getAfipCode') ? $e->getAfipCode() : null,
            ]);
            throw new \Exception("Error al autorizar con AFIP: {$e->getMessage()}", 0, $e);
        } catch (\Exception $e) {
            Log::error('Error inesperado al autorizar venta con AFIP', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Normaliza la respuesta de autorización de AFIP.
     * El SDK puede devolver camelCase, snake_case o claves del WS (CAE, CAEFchVto, CbteDesde, PtoVta, CbteTipo).
     * Si la respuesta viene anidada (FeDetResp, FECAEDetResponse, etc.), extrae el detalle.
     *
     * @param array<string, mixed> $raw Respuesta cruda de authorizeInvoice
     * @return array{cae: ?string, caeExpirationDate: ?string, invoiceNumber: ?int|string, pointOfSale: ?int, invoiceType: ?int}
     */
    private function normalizeAfipAuthorizationResponse(array $raw): array
    {
        $data = $raw;

        // Respuesta anidada: FeDetResp->FECAEDetResponse o similar
        if (isset($raw['FeDetResp']['FECAEDetResponse'])) {
            $data = $raw['FeDetResp']['FECAEDetResponse'];
        } elseif (isset($raw['FECAEDetResponse'])) {
            $data = $raw['FECAEDetResponse'];
        } elseif (isset($raw['FeDetResp'][0])) {
            $data = $raw['FeDetResp'][0];
        } elseif (isset($raw['result']) && is_array($raw['result'])) {
            $data = $raw['result'];
        }

        // Si es un array de detalles, tomar el primero
        if (isset($data[0]) && is_array($data[0])) {
            $data = $data[0];
        }

        $cae = $data['CAE'] ?? $data['cae'] ?? null;
        $caeExpiration = $data['CAEFchVto'] ?? $data['caeExpirationDate'] ?? $data['cae_expiration_date'] ?? null;
        $invoiceNumber = $data['CbteDesde'] ?? $data['CbteNro'] ?? $data['invoiceNumber'] ?? $data['invoice_number'] ?? null;
        $pointOfSale = $data['PtoVta'] ?? $data['pointOfSale'] ?? $data['point_of_sale'] ?? null;
        $invoiceType = $data['CbteTipo'] ?? $data['invoiceType'] ?? $data['invoice_type'] ?? null;

        return [
            'cae' => $cae !== null && $cae !== '' ? (string) $cae : null,
            'caeExpirationDate' => $caeExpiration !== null && $caeExpiration !== '' ? (string) $caeExpiration : null,
            'invoiceNumber' => $invoiceNumber !== null && $invoiceNumber !== '' ? $invoiceNumber : null,
            'pointOfSale' => $pointOfSale !== null && $pointOfSale !== '' ? (int) $pointOfSale : null,
            'invoiceType' => $invoiceType !== null && $invoiceType !== '' ? (int) $invoiceType : null,
        ];
    }

    /**
     * Prepara los datos de la venta para enviar a AFIP
     *
     * @param SaleHeader $sale La venta a preparar
     * @return array Datos formateados para AFIP
     */
    private function prepareInvoiceDataForAfip(SaleHeader $sale): array
    {
        // Obtener punto de venta
        $pointOfSale = 1;
        if ($sale->branch && !empty($sale->branch->point_of_sale)) {
            $pos = (int) $sale->branch->point_of_sale;
            if ($pos >= 1) {
                $pointOfSale = $pos;
            }
        } else {
            $pointOfSale = (int) config('afip.default_point_of_sale', 1);
            if ($pointOfSale < 1) {
                $pointOfSale = 1;
            }
        }

        // Obtener tipo de comprobante AFIP
        $invoiceType = $this->mapReceiptTypeToAfipType($sale->receiptType);

        // Obtener el próximo número de comprobante desde AFIP (FECompUltimoAutorizado) para evitar error 10016
        $invoiceNumber = null;
        $taxpayerCuit = null;
        if ($sale->branch && !empty($sale->branch->cuit)) {
            $taxpayerCuit = preg_replace('/[^0-9]/', '', $sale->branch->cuit);
            if (strlen($taxpayerCuit) === AfipConstants::CUIT_LENGTH) {
                try {
                    $lastAuthorized = \Resguar\AfipSdk\Facades\Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType, $taxpayerCuit);
                    $lastCbte = (int) ($lastAuthorized['CbteNro'] ?? 0);
                    $invoiceNumber = $lastCbte + 1;
                } catch (\Throwable $e) {
                    Log::warning('No se pudo obtener último comprobante autorizado de AFIP, se usará el número de la venta', [
                        'sale_id' => $sale->id,
                        'point_of_sale' => $pointOfSale,
                        'invoice_type' => $invoiceType,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
        if ($invoiceNumber === null && !empty($sale->receipt_number)) {
            $invoiceNumber = (int) preg_replace('/[^0-9]/', '', $sale->receipt_number);
            if ($invoiceNumber < 1) {
                $invoiceNumber = null;
            }
        }

        $customerCuit = '00000000000';
        $customerDocumentType = AfipConstants::DOC_TIPO_CONSUMIDOR_FINAL;
        $customerDocumentNumber = '00000000000';

        // Priorizar la identidad fiscal seleccionada (customerTaxIdentity) si existe
        if ($sale->customerTaxIdentity && !empty($sale->customerTaxIdentity->cuit)) {
            $cuit = preg_replace('/[^0-9]/', '', $sale->customerTaxIdentity->cuit);
            if (strlen($cuit) === AfipConstants::CUIT_LENGTH) {
                $customerCuit = $cuit;
                $customerDocumentType = AfipConstants::DOC_TIPO_CUIT;
                $customerDocumentNumber = $cuit;
            }
        } elseif ($sale->customer && $sale->customer->person) {
            // Fallback: usar CUIT del person del customer
            $cuit = preg_replace('/[^0-9]/', '', $sale->customer->person->cuit ?? '');
            if (strlen($cuit) === AfipConstants::CUIT_LENGTH) {
                $customerCuit = $cuit;
                $customerDocumentType = AfipConstants::DOC_TIPO_CUIT;
                $customerDocumentNumber = $cuit;
            } elseif (!empty($sale->sale_document_number)) {
                $docNumber = preg_replace('/[^0-9]/', '', $sale->sale_document_number);
                if (strlen($docNumber) > 0) {
                    $customerDocumentNumber = $docNumber;
                    $customerDocumentType = $this->mapDocumentTypeToAfipType($sale->saleDocumentType);
                }
            }
        }

        // Obtener condición IVA del receptor
        $receiverConditionIVA = 5; // Consumidor Final por defecto
        if ($sale->saleFiscalCondition) {
            $receiverConditionIVA = (int) ($sale->saleFiscalCondition->afip_code ?? 5);
        }

        // Preparar items
        $items = [];
        $netAmount = 0.0;
        $ivaItems = [];

        foreach ($sale->items as $item) {
            $product = $item->product;
            $ivaRate = $item->iva_rate ?? ($product && $product->iva ? (float) $product->iva->rate : 0.0);

            $description = $product ? ($product->description ?? $product->name ?? 'Producto sin descripción') : 'Producto sin descripción';
            $description = mb_substr($description, 0, 250); // AFIP limita a 250 caracteres

            $quantity = (float) $item->quantity;
            $unitPrice = (float) $item->unit_price;
            $itemSubtotal = (float) $item->item_subtotal ?? ($unitPrice * $quantity);

            // Para Factura B (6) y comprobantes 'B' (7, 8, 9, 10), el precio unitario debe incluir IVA (Precio Final).
            // Para el resto (A, M, C, etc.), se usa el precio neto.
            // Códigos 'B': 6 (Factura B), 7 (Nota Debito B), 8 (Nota Credito B), 9 (Recibo B), 10 (Nota Venta B)
            if (in_array($invoiceType, [6, 7, 8, 9, 10], true)) {
                // Calcular precio unitario final (con IVA)
                // Se usa item_total (Neto + IVA) dividido por cantidad para obtener el unitario final efectivo
                $totalWithIva = (float) $item->item_total;
                // Evitar división por cero
                if ($quantity > 0) {
                    $unitPrice = round($totalWithIva / $quantity, 2);
                } else {
                    $unitPrice = 0.0;
                }
            }

            $items[] = [
                'description' => $description,
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'taxRate' => $ivaRate,
            ];

            $netAmount += $itemSubtotal;
        }

        // Preparar IVA items (AlicIVA). AFIP 10051 exige que importe = base × (porcentaje/100) con 2 decimales.
        foreach ($sale->saleIvas as $saleIva) {
            $iva = $saleIva->iva;
            if ($iva) {
                $ivaId = $this->mapIvaRateToAfipId((float) $iva->rate);
                if ($ivaId) {
                    $baseAmount = round((float) ($saleIva->base_amount ?? 0), 2);
                    // Recalcular importe desde base y alícuota para que coincida con el porcentaje (evita error 10051)
                    $rate = (float) $iva->rate;
                    $taxAmount = round($baseAmount * ($rate / 100.0), 2);

                    $existingIndex = null;
                    foreach ($ivaItems as $index => $ivaItem) {
                        if ($ivaItem['id'] === $ivaId) {
                            $existingIndex = $index;
                            break;
                        }
                    }

                    if ($existingIndex !== null) {
                        $ivaItems[$existingIndex]['baseAmount'] = round($ivaItems[$existingIndex]['baseAmount'] + $baseAmount, 2);
                        $ivaItems[$existingIndex]['amount'] = round($ivaItems[$existingIndex]['amount'] + $taxAmount, 2);
                    } else {
                        $ivaItems[] = [
                            'id' => $ivaId,
                            'baseAmount' => $baseAmount,
                            'amount' => $taxAmount,
                        ];
                    }
                }
            }
        }

        // Recalcular cada ivaItem amount desde baseAmount y el porcentaje del id AFIP (garantiza 10051)
        $afipIdToRate = [3 => 0.0, 4 => 10.5, 5 => 21.0, 6 => 27.0];
        foreach ($ivaItems as $idx => $item) {
            $rate = $afipIdToRate[$item['id']] ?? null;
            if ($rate !== null) {
                $ivaItems[$idx]['amount'] = round($item['baseAmount'] * ($rate / 100.0), 2);
            }
        }

        if (empty($ivaItems)) {
            $ivaTotalFromSale = round((float) ($sale->total_iva_amount ?? 0.0), 2);
            if ($ivaTotalFromSale > 0) {
                $ivaItems[] = [
                    'id' => 5,
                    'baseAmount' => round($netAmount, 2),
                    'amount' => round($netAmount * 0.21, 2),
                ];
            }
        }

        // IVA total = suma de AlicIVA (debe coincidir con lo que enviamos para evitar 10051)
        $ivaTotal = 0.0;
        foreach ($ivaItems as $item) {
            $ivaTotal += (float) $item['amount'];
        }
        $ivaTotal = round($ivaTotal, 2);

        // Validaciones finales
        if (empty($items)) {
            throw new \Exception('La venta debe tener al menos un ítem');
        }

        if ($sale->total <= 0) {
            throw new \Exception('El total de la venta debe ser mayor a cero');
        }

        // ...
        $isFacturaB = in_array($invoiceType, [6, 7, 8, 9, 10], true);

        // Total debe ser netAmount + ivaTotal para que AFIP no rechace por incoherencia en Factura A
        // En Factura B, usamos el total de la venta directamente (o suma de items con IVA)
        $totalForAfip = $isFacturaB
            ? round((float) $sale->total, 2)
            : round($netAmount + $ivaTotal, 2);

        $payload = [
            'pointOfSale' => $pointOfSale,
            'invoiceType' => $invoiceType,
            'invoiceNumber' => $invoiceNumber,
            'date' => Carbon::parse($sale->date)->format('Ymd'),
            'customerCuit' => $customerCuit,
            'customerDocumentType' => $customerDocumentType,
            'customerDocumentNumber' => $customerDocumentNumber,
            'receiverConditionIVA' => $receiverConditionIVA,
            'concept' => $this->determineConcept($sale),
            'items' => $items,
            'total' => $totalForAfip,
        ];

        // Siempre incluir desglose de montos para evitar error 10048 de AFIP
        $payload['netAmount'] = round($netAmount, 2);
        $payload['ivaTotal'] = round($ivaTotal, 2);
        $payload['ivaItems'] = $ivaItems;

        return $payload;
    }

    /**
     * Mapea el tipo de comprobante a código AFIP
     */
    private function mapReceiptTypeToAfipType(?ReceiptType $receiptType): int
    {
        if (!$receiptType) {
            return 1; // Factura A por defecto
        }

        $numericCode = null;
        $afipCode = $receiptType->afip_code ?? null;
        if ($afipCode) {
            $numericCode = (int) preg_replace('/[^0-9]/', '', (string) $afipCode);
        }

        if ($numericCode) {
            if (!array_key_exists($numericCode, self::SUPPORTED_AFIP_RECEIPT_TYPES)) {
                throw new \Exception(sprintf(
                    'El comprobante "%s" (código %s) no es válido para AFIP. Configura la venta con un comprobante habilitado (ej: Factura A/B/C).',
                    $receiptType->description ?? $receiptType->name ?? 'desconocido',
                    $receiptType->afip_code ?? 'N/A'
                ));
            }

            return $numericCode;
        }

        // Fallback por nombre
        $name = strtoupper($receiptType->name ?? $receiptType->description ?? '');
        foreach (self::SUPPORTED_AFIP_RECEIPT_TYPES as $code => $label) {
            if (str_contains($name, $label)) {
                return $code;
            }
        }

        throw new \Exception(sprintf(
            'No se pudo determinar un tipo de comprobante AFIP válido para "%s". Configura el comprobante con un código permitido.',
            $receiptType->description ?? $receiptType->name ?? 'desconocido'
        ));
    }

    /**
     * Mapea el tipo de documento a código AFIP
     */
    private function mapDocumentTypeToAfipType($documentType): int
    {
        if (!$documentType) {
            return AfipConstants::DOC_TIPO_CONSUMIDOR_FINAL;
        }

        $afipCode = $documentType->afip_code ?? null;
        if ($afipCode !== null && $afipCode !== '') {
            return (int) $afipCode;
        }

        return AfipConstants::DOC_TIPO_CONSUMIDOR_FINAL;
    }

    /**
     * Mapea la tasa de IVA a ID de AFIP
     */
    private function mapIvaRateToAfipId(float $rate): ?int
    {
        $roundedRate = round($rate, 1);

        // Mapeo de tasas comunes de IVA a IDs de AFIP
        if ($roundedRate == 0) {
            return 3; // 0%
        } elseif ($roundedRate == 10.5) {
            return 4; // 10.5%
        } elseif ($roundedRate == 21) {
            return 5; // 21%
        } elseif ($roundedRate == 27) {
            return 6; // 27%
        }

        // Si no coincide, retornar null (el SDK puede manejarlo)
        return null;
    }

    /**
     * Determina el concepto de la factura (1=Productos, 2=Servicios, 3=Productos y Servicios)
     */
    private function determineConcept(SaleHeader $sale): int
    {
        // Por ahora, asumimos que todas son productos
        // En el futuro, se puede determinar basándose en los items
        return 1; // Productos
    }

    /**
     * Construye el array de datos del comprobante en el formato esperado por el SDK AFIP
     * para renderTicketHtml y renderFacturaA4Html (issuer, receiver, items, totales, fecha).
     *
     * @return array{issuer: array, receiver: array, items: array, total: float, netAmount: float, totalIva: float, date: string, concept: int, condicion_venta: string}
     */
    /**
     * Domicilio del emisor para comprobantes fiscales (SDK).
     * Prioridad: domicilio comercial de la sucursal > configuración global > dirección de la sucursal.
     */
    private function resolveIssuerDomicilioForFiscal(\App\Models\Branch $branch): string
    {
        $value = $branch->domicilio_comercial
            ?? SettingHelper::get('company_address')
            ?? $branch->address
            ?? '';

        return (string) $value;
    }

    private function buildInvoiceDataForSdk(SaleHeader $sale): array
    {
        $branch = $sale->branch;

        $issuer = [
            'razon_social' => (string) (SettingHelper::get('company_name') ?? $branch->razon_social ?? $branch->description ?? ''),
            'domicilio' => $this->resolveIssuerDomicilioForFiscal($branch),
            'cuit' => (string) (preg_replace('/[^0-9]/', '', (string) ($branch->cuit ?? SettingHelper::get('company_ruc') ?? '')) ?: '0'),
            'condicion_iva' => (string) ($branch->iva_condition ?? 'Responsable Inscripto'),
            'iibb' => $branch->iibb ? (string) $branch->iibb : null,
            'inicio_actividad' => $branch->start_date
                ? Carbon::parse($branch->start_date)->format('d/m/Y')
                : null,
        ];

        $receiverName = 'Consumidor Final';
        $receiverDoc = '0';
        $receiverCondicionIva = 'Consumidor final';

        // Prioridad: identidad fiscal elegida en la venta (CUIT/razón social/condición)
        $chosenIdentity = $sale->relationLoaded('customerTaxIdentity')
            ? $sale->customerTaxIdentity
            : $sale->customerTaxIdentity()->with('fiscalCondition')->first();

        if ($chosenIdentity) {
            $receiverName = (string) ($chosenIdentity->business_name ?: 'Consumidor Final');
            $receiverDoc = $chosenIdentity->cuit && strlen(preg_replace('/[^0-9]/', '', (string) $chosenIdentity->cuit)) === AfipConstants::CUIT_LENGTH
                ? preg_replace('/[^0-9]/', '', (string) $chosenIdentity->cuit)
                : ($sale->sale_document_number ? (string) $sale->sale_document_number : '0');
            if ($chosenIdentity->relationLoaded('fiscalCondition') && $chosenIdentity->fiscalCondition?->name) {
                $receiverCondicionIva = (string) $chosenIdentity->fiscalCondition->name;
            } elseif ($sale->saleFiscalCondition && !empty($sale->saleFiscalCondition->name)) {
                $receiverCondicionIva = (string) $sale->saleFiscalCondition->name;
            }
        } elseif ($sale->customer) {
            $receiverName = (string) ($sale->customer->business_name ?? trim(
                ($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? '')
            ) ?: 'Consumidor Final');
            $cuit = $sale->customer->person->cuit ?? null;
            $receiverDoc = $cuit && strlen(preg_replace('/[^0-9]/', '', $cuit)) === AfipConstants::CUIT_LENGTH
                ? preg_replace('/[^0-9]/', '', $cuit)
                : ($sale->sale_document_number ? (string) $sale->sale_document_number : '0');
            if ($sale->saleFiscalCondition && !empty($sale->saleFiscalCondition->name)) {
                $receiverCondicionIva = (string) $sale->saleFiscalCondition->name;
            }
        }

        $receiver = [
            'nombre' => $receiverName,
            'nro_doc' => $receiverDoc,
            'condicion_iva' => $receiverCondicionIva,
        ];

        // Detectar si es Factura B (Consumer Invoice)
        // Códigos 'B': 6 (Factura B), 7 (Nota Debito B), 8 (Nota Credito B), 9 (Recibo B), 10 (Nota Venta B)
        // Wait, I need to get invoiceType first. It's not in the code I viewed.
        // Let me re-read the function start to see where invoiceType comes from or if I need to calculate it.
        // In prepareInvoiceDataForAfip it calls mapReceiptTypeToAfipType. I should do the same here.

        $invoiceType = $this->mapReceiptTypeToAfipType($sale->receiptType);
        $isFacturaB = in_array($invoiceType, [6, 7, 8, 9, 10], true);

        $items = [];
        foreach ($sale->items as $item) {
            $product = $item->product;
            $description = $product
                ? ($product->description ?? $product->name ?? 'Producto')
                : 'Producto';
            $description = mb_substr((string) $description, 0, 250);

            $quantity = (float) $item->quantity;
            $unitPrice = (float) $item->unit_price; // Por defecto NETO (Factura A)
            $ivaRate = (float) ($item->iva_rate ?? ($product && $product->iva ? $product->iva->rate : 0));

            // Por defecto Subtotal NETO (Factura A)
            // item_subtotal es la base neta
            $subtotal = (float) ($item->item_subtotal ?? ($unitPrice * $quantity));

            // Ajuste para Factura B: Precio Unitario y Subtotal deben ser CON IVA (Precio Final)
            if ($isFacturaB) {
                // Calcular precio unitario final (con IVA)
                // Se usa item_total (Neto + IVA) dividido por cantidad para obtener el unitario final efectivo
                $totalWithIva = (float) $item->item_total;

                // Subtotal para Factura B es el Total con IVA
                $subtotal = $totalWithIva;

                // Evitar división por cero
                if ($quantity > 0) {
                    $unitPrice = round($totalWithIva / $quantity, 2);
                } else {
                    $unitPrice = 0.0;
                }
            }

            $items[] = [
                'description' => $description,
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'taxRate' => (string) $ivaRate,
                'subtotal' => round($subtotal, 2),
            ];
        }

        $condicionVenta = 'Efectivo';
        if ($sale->relationLoaded('paymentType') && $sale->paymentType) {
            $condicionVenta = (string) ($sale->paymentType->name ?? $sale->paymentType->description ?? 'Efectivo');
        } elseif ($sale->payment_method_id) {
            $pm = PaymentMethod::find($sale->payment_method_id);
            if ($pm) {
                $condicionVenta = (string) ($pm->name ?? $pm->description ?? 'Efectivo');
            }
        }

        $saleDate = Carbon::parse($sale->date);

        // Determinar DocTipo para AFIP QR (ARCA)
        $receiverDocType = AfipConstants::DOC_TIPO_CONSUMIDOR_FINAL; // Default 99

        // Si el documento tiene 11 dígitos se asume CUIT (80)
        // Validación más estricta podría requerir ver el document_type del cliente si está disponible, 
        // pero por ahora CUIT vs DNI vs CF se infiere bien por longitud/valor en la mayoría de casos de facturación.
        if ($receiverDoc !== '0') {
            if (strlen($receiverDoc) === AfipConstants::CUIT_LENGTH) {
                $receiverDocType = AfipConstants::DOC_TIPO_CUIT; // 80 - CUIT
            } elseif (strlen($receiverDoc) >= 7 && strlen($receiverDoc) <= 8) {
                $receiverDocType = AfipConstants::DOC_TIPO_DNI; // 96 - DNI
            }
        }

        $invoice = [
            // Datos específicos para QR (ARCA)
            'customerDocumentType' => $receiverDocType,
            'customerDocumentNumber' => $receiverDoc,
            'codAut' => $sale->cae ? (string) $sale->cae : null,
            'issuer' => $issuer,
            'receiver' => $receiver,
            'items' => $items,
            'total' => round((float) $sale->total, 2),
            'date' => $saleDate->format('Ymd'),
            'concept' => $this->determineConcept($sale),
            'condicion_venta' => $condicionVenta,
            // Agregamos invoiceType para que el renderer sepa si es A o B
            'invoiceType' => $invoiceType,
        ];

        // Solo agregar netAmount y totalIva si NO es Factura B
        if (!$isFacturaB) {
            $invoice['netAmount'] = round((float) $sale->subtotal, 2);
            $invoice['totalIva'] = round((float) ($sale->total_iva_amount ?? 0), 2);
        }

        // Período facturado y vto. pago (template A4; si no se envían, el SDK usa la fecha del comprobante)
        if ($sale->service_from_date) {
            $invoice['periodo_desde'] = Carbon::parse($sale->service_from_date)->format('d/m/Y');
        }
        if ($sale->service_to_date) {
            $invoice['periodo_hasta'] = Carbon::parse($sale->service_to_date)->format('d/m/Y');
        }
        if ($sale->service_due_date) {
            $invoice['fecha_vto_pago'] = Carbon::parse($sale->service_due_date)->format('d/m/Y');
        }

        // Pie opcional del template A4 (texto y/o logo)
        $invoice['footer_text'] = 'Generado con Afip SDK';
        $footerLogo = SettingHelper::get('logo_url');
        if (is_string($footerLogo) && $footerLogo !== '') {
            $invoice['footer_logo_src'] = str_starts_with($footerLogo, 'http') ? $footerLogo : rtrim(config('app.url', ''), '/') . '/' . ltrim($footerLogo, '/');
        } elseif (is_array($footerLogo) && !empty($footerLogo['url'])) {
            $invoice['footer_logo_src'] = (string) $footerLogo['url'];
        }

        return $invoice;
    }

    /**
     * Adapta el array de respuesta (camelCase) al formato que espera InvoiceResponse::fromArray().
     *
     * @param array{cae: ?string, caeExpirationDate: ?string, invoiceNumber: ?int, pointOfSale: ?int, invoiceType: ?int} $data
     * @return array{cae: string, cae_expiration_date: string, invoice_number: int, point_of_sale: int, invoice_type: int}
     */
    private function normalizeArrayForInvoiceResponse(array $data): array
    {
        $caeExpiration = $data['caeExpirationDate'] ?? $data['cae_expiration_date'] ?? '';
        return [
            'cae' => (string) ($data['cae'] ?? ''),
            'codAut' => (string) ($data['cae'] ?? ''), // Add param codAut
            'cae_expiration_date' => (string) $caeExpiration,
            'caeExpirationDate' => (string) $caeExpiration,
            'invoice_number' => (int) ($data['invoiceNumber'] ?? 0),
            'point_of_sale' => (int) ($data['pointOfSale'] ?? 0),
            'invoice_type' => (int) ($data['invoiceType'] ?? 0),
        ];
    }

    /**
     * Construye el array de respuesta AFIP desde la venta (CAE, vencimiento, número, punto de venta, tipo).
     * Usado por el SDK para renderTicketHtml y renderFacturaA4Html (QR y datos del comprobante).
     *
     * @return array{cae: ?string, caeExpirationDate: ?string, invoiceNumber: ?int, pointOfSale: ?int, invoiceType: ?int}
     */
    private function buildAfipResponseFromSale(SaleHeader $sale): array
    {
        $caeExpiration = null;
        if ($sale->cae_expiration_date) {
            $caeExpiration = Carbon::parse($sale->cae_expiration_date)->format('Ymd');
        }

        $invoiceNumber = null;
        if (!empty($sale->receipt_number)) {
            $invoiceNumber = (int) preg_replace('/[^0-9]/', '', (string) $sale->receipt_number);
            if ($invoiceNumber < 1) {
                $invoiceNumber = null;
            }
        }

        $pointOfSale = 1;
        if ($sale->branch && !empty($sale->branch->point_of_sale)) {
            $pos = (int) $sale->branch->point_of_sale;
            if ($pos >= 1) {
                $pointOfSale = $pos;
            }
        }

        $invoiceType = $this->mapReceiptTypeToAfipType($sale->receiptType);

        return [
            'cae' => $sale->cae ? (string) $sale->cae : null,
            'codAut' => $sale->cae ? (string) $sale->cae : null, // Add param codAut
            'caeExpirationDate' => $caeExpiration,
            'invoiceNumber' => $invoiceNumber,
            'pointOfSale' => $pointOfSale,
            'invoiceType' => $invoiceType,
        ];
    }

    /**
     * Convertir un presupuesto a venta
     * 
     * @param int $budgetId ID del presupuesto a convertir
     * @param int $newReceiptTypeId ID del nuevo tipo de comprobante
     * @param int $userId ID del usuario que convierte
     * @param int|null $cashRegisterId ID de la caja registradora
     * @param int|null $paymentMethodId ID del método de pago (si se especifica, reemplaza los pagos del presupuesto)
     * @return SaleHeader
     * @throws \Exception
     */
    public function convertBudgetToSale(int $budgetId, int $newReceiptTypeId, int $userId, ?int $cashRegisterId = null, ?int $paymentMethodId = null): SaleHeader
    {
        return DB::transaction(function () use ($budgetId, $newReceiptTypeId, $userId, $cashRegisterId, $paymentMethodId) {
            // Buscar el presupuesto con relaciones necesarias
            $budget = SaleHeader::with(['items.product', 'receiptType', 'customer', 'salePayments'])
                ->lockForUpdate()
                ->find($budgetId);

            if (!$budget) {
                throw new \Exception('Presupuesto no encontrado.');
            }

            // Validaciones
            $this->validateIsBudget($budget);
            $this->validateBudgetNotAnnulled($budget);
            $this->validateBudgetNotConverted($budget);
            $this->validateBudgetManagementPermission($userId);

            // Obtener y validar el nuevo tipo de comprobante
            $newReceiptType = ReceiptType::find($newReceiptTypeId);
            if (!$newReceiptType) {
                throw new \Exception('Tipo de comprobante no válido.');
            }
            $this->validateNotBudgetReceiptType($newReceiptType);

            // Validar método de pago si se especifica
            $paymentMethod = null;
            if ($paymentMethodId) {
                $paymentMethod = \App\Models\PaymentMethod::find($paymentMethodId);
                if (!$paymentMethod) {
                    throw new \Exception('Método de pago no válido.');
                }
                // Si el método de pago afecta la caja, validar que haya una caja abierta
                if ($paymentMethod->affects_cash && !$cashRegisterId) {
                    throw new \Exception('Se requiere una caja abierta para el método de pago seleccionado.');
                }
            }

            // Generar número de comprobante
            $newReceiptNumber = $this->generateNextReceiptNumber($budget->branch_id, $newReceiptTypeId);

            // Crear la nueva venta basada en el presupuesto (secuencia contigua de ventas)
            $sale = SaleHeader::create([
                'branch_id' => $budget->branch_id,
                'receipt_type_id' => $newReceiptTypeId,
                'receipt_number' => $newReceiptNumber,
                'numbering_scope' => SaleNumberingScope::SALE,
                'date' => Carbon::now(),
                'customer_id' => $budget->customer_id,
                'user_id' => $userId,
                'subtotal' => $budget->subtotal,
                'total_iva_amount' => $budget->total_iva_amount,
                'total' => $budget->total,
                'discount_type' => $budget->discount_type,
                'discount_value' => $budget->discount_value,
                'discount_amount' => $budget->discount_amount,
                'fiscal_condition_id' => $budget->fiscal_condition_id,
                'document_type_id' => $budget->document_type_id,
                'document_number' => $budget->document_number,
                'notes' => $budget->notes,
                'status' => 'active',
                'cash_register_id' => $cashRegisterId,
                'converted_from_budget_id' => $budget->id,
            ]);

            // Copiar datos del presupuesto a la venta
            $this->copyBudgetItems($budget, $sale);
            $this->copyBudgetIvas($budget, $sale);

            // Si se especificó un método de pago, crear el pago con ese método
            // De lo contrario, copiar los pagos del presupuesto
            if ($paymentMethodId) {
                $sale->salePayments()->create([
                    'payment_method_id' => $paymentMethodId,
                    'amount' => $sale->total,
                ]);
            } else {
                $this->copyBudgetPayments($budget, $sale);
            }

            // Registrar movimientos de caja y cuenta corriente
            if ($cashRegisterId) {
                $this->registerSaleMovementFromPayments($sale, $cashRegisterId);
            }

            // Marcar presupuesto como convertido
            $budget->status = 'converted';
            $budget->converted_to_sale_id = $sale->id;
            $budget->converted_at = Carbon::now();
            $budget->converted_by = $userId;
            $budget->save();

            return $sale->fresh(['items.product', 'saleIvas', 'receiptType', 'customer', 'branch', 'salePayments.paymentMethod']);
        });
    }

    /**
     * Eliminar/Cancelar un presupuesto
     * 
     * @param int $budgetId ID del presupuesto
     * @param int $userId ID del usuario
     * @return bool
     * @throws \Exception
     */
    public function deleteBudget(int $budgetId, int $userId): bool
    {
        return DB::transaction(function () use ($budgetId, $userId) {
            $budget = SaleHeader::with('receiptType')->lockForUpdate()->find($budgetId);

            if (!$budget) {
                throw new \Exception('Presupuesto no encontrado.');
            }

            // Verificar que sea un presupuesto
            if (!$budget->receiptType || !AfipConstants::isPresupuesto($budget->receiptType->afip_code)) {
                throw new \Exception('Solo se pueden eliminar presupuestos.');
            }

            // Verificar que no esté convertido
            if ($budget->status === 'converted') {
                throw new \Exception('No se puede eliminar un presupuesto que ya fue convertido a venta.');
            }

            // Marcar como anulado (no eliminamos físicamente para mantener historial)
            $budget->status = 'annulled';
            $budget->save();

            return true;
        });
    }

    /**
     * Obtener lista de presupuestos
     * 
     * @param Request $request
     * @return LengthAwarePaginator
     */
    public function getBudgets(Request $request): LengthAwarePaginator
    {
        // Obtener el tipo de presupuesto (código AFIP 016)
        $budgetReceiptType = ReceiptType::where('afip_code', AfipConstants::RECEIPT_CODE_PRESUPUESTO)->first();

        if (!$budgetReceiptType) {
            // Retornar paginador vacío
            return new LengthAwarePaginator([], 0, 15, 1);
        }

        $query = SaleHeader::with([
            'receiptType',
            'branch',
            'customer.person',
            'user.person',
            'items.product',
            'convertedToSale',
            'salePayments.paymentMethod',
        ])->where('receipt_type_id', $budgetReceiptType->id);

        // Filtrar estados: solo 'active' por defecto (no convertidos ni anulados)
        $status = $request->input('status', 'active');
        if ($status !== 'all') {
            if ($status === 'active') {
                $query->whereIn('status', ['active', 'approved', 'pending']);
            } else {
                $query->where('status', $status);
            }
        }

        // Filtro por sucursal
        if ($request->has('branch_id')) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds) && count($branchIds) > 0) {
                $query->whereIn('branch_id', $branchIds);
            } elseif (!is_array($branchIds)) {
                $query->where('branch_id', $branchIds);
            }
        }

        // Filtro por fecha
        $from = $request->input('from_date') ?? $request->input('from');
        $to = $request->input('to_date') ?? $request->input('to');
        if ($from) {
            $query->whereDate('date', '>=', Carbon::parse($from)->startOfDay());
        }
        if ($to) {
            $query->whereDate('date', '<=', Carbon::parse($to)->endOfDay());
        }

        // Búsqueda
        if ($request->has('search') && $request->input('search')) {
            $searchTerm = trim($request->input('search'));
            $query->where(function ($q) use ($searchTerm) {
                $q->where('receipt_number', 'like', "%{$searchTerm}%")
                    ->orWhereHas('customer.person', function ($subQuery) use ($searchTerm) {
                        $subQuery->where('first_name', 'like', "%{$searchTerm}%")
                            ->orWhere('last_name', 'like', "%{$searchTerm}%")
                            ->orWhere('phone', 'like', "%{$searchTerm}%")
                            ->orWhere('documento', 'like', "%{$searchTerm}%")
                            ->orWhere('cuit', 'like', "%{$searchTerm}%");
                    });
            });
        }

        // Paginación
        $limit = (int) ($request->input('limit', 15));
        $limit = min($limit, 500); // Limitar a máximo 500 registros por página
        $page = (int) ($request->input('page', 1));

        $paginated = $query->orderByDesc('date')->paginate($limit, ['*'], 'page', $page);

        $budgets = $paginated->items();

        // Mapear los datos
        $mappedData = collect($budgets)->map(function ($budget) {
            $customerName = '';
            if ($budget->customer && $budget->customer->person) {
                $customerName = trim($budget->customer->person->first_name . ' ' . $budget->customer->person->last_name);
            } elseif ($budget->customer && $budget->customer->business_name) {
                $customerName = $budget->customer->business_name;
            } else {
                $customerName = 'N/A';
            }

            $creatorName = '';
            if ($budget->user && $budget->user->person) {
                $creatorName = trim($budget->user->person->first_name . ' ' . $budget->user->person->last_name);
            } elseif ($budget->user && $budget->user->username) {
                $creatorName = $budget->user->username;
            } else {
                $creatorName = 'N/A';
            }

            // Extraer datos del cliente de forma segura para evitar errores de null
            $customerData = null;
            if ($budget->customer) {
                $customerData = [
                    'id' => $budget->customer->id,
                    'name' => $customerName,
                    'dni' => $budget->customer->person?->documento ?? null,
                    'cuit' => $budget->customer->person?->cuit ?? null,
                    'fiscal_condition_id' => $budget->customer->fiscal_condition_id ?? null,
                    'fiscal_condition_name' => $budget->customer->fiscalCondition?->name ?? null,
                ];
            }

            return [
                'id' => $budget->id,
                'date' => $budget->date ? Carbon::parse($budget->date)->format('Y-m-d H:i:s') : '',
                'date_display' => $budget->date ? Carbon::parse($budget->date)->format('d/m/Y H:i') : '',
                'receipt_type' => $budget->receiptType ? $budget->receiptType->description : 'Presupuesto',
                'receipt_number' => $budget->receipt_number ?? '',
                'customer' => $customerName,
                'customer_id' => $budget->customer_id,
                'customer_data' => $customerData,
                'creator' => $creatorName,
                'creator_id' => $budget->user_id,
                'items_count' => $budget->items->count(),
                'total' => (float) $budget->total,
                'status' => $budget->status,
                'branch' => $budget->branch ? $budget->branch->description : '',
                'branch_color' => $budget->branch ? $budget->branch->color : null,
                'branch_id' => $budget->branch_id,
                'items' => $budget->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => (float) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'discount_type' => $item->discount_type,
                        'discount_value' => (float) $item->discount_value,
                        'product' => $item->product ? [
                            'id' => $item->product->id,
                            'code' => $item->product->code,
                            'description' => $item->product->description,
                            'sale_price' => (float) $item->product->sale_price,
                            'iva' => $item->product->iva,
                        ] : null
                    ];
                }),
                'payments' => $budget->salePayments->map(function ($payment) {
                    return [
                        'payment_method_id' => $payment->payment_method_id,
                        'amount' => (float) $payment->amount,
                        'payment_method_name' => $payment->paymentMethod ? $payment->paymentMethod->name : 'N/A',
                        'discount_percentage' => $payment->paymentMethod ? (float) $payment->paymentMethod->discount_percentage : 0,
                    ];
                }),
                // Campos de conversión
                'converted_to_sale_id' => $budget->converted_to_sale_id,
                'converted_to_sale_receipt' => $budget->convertedToSale ? $budget->convertedToSale->receipt_number : null,
                'converted_at' => $budget->converted_at ? Carbon::parse($budget->converted_at)->format('Y-m-d H:i:s') : null,
                'converted_from_budget_id' => $budget->converted_from_budget_id,
            ];
        })->toArray();

        // Crear nuevo paginador con los datos mapeados
        $mappedPaginator = new LengthAwarePaginator(
            $mappedData,
            $paginated->total(),
            $paginated->perPage(),
            $paginated->currentPage(),
            [
                'path' => $paginated->path(),
            ]
        );

        return $mappedPaginator;
    }

    /**
     * Aprobar un presupuesto pendiente
     * 
     * @param int $id
     * @return SaleHeader
     * @throws \Exception
     */
    public function approveBudget(int $id): SaleHeader
    {
        $budget = SaleHeader::find($id);

        if (!$budget) {
            throw new \Exception('Presupuesto no encontrado.');
        }

        if ($budget->status !== 'pending') {
            throw new \Exception('Solo se pueden aprobar presupuestos pendientes.');
        }

        $budget->status = 'approved';
        $budget->save();

        return $budget;
    }

    /**
     * Valida que el registro sea un presupuesto válido
     *
     * @param SaleHeader $budget
     * @throws \Exception
     */
    private function validateIsBudget(SaleHeader $budget): void
    {
        if (!$budget->receiptType || !AfipConstants::isPresupuesto($budget->receiptType->afip_code)) {
            throw new \Exception('El comprobante seleccionado no es un presupuesto.');
        }
    }

    /**
     * Valida que el presupuesto no esté anulado
     *
     * @param SaleHeader $budget
     * @throws \Exception
     */
    private function validateBudgetNotAnnulled(SaleHeader $budget): void
    {
        if ($budget->status === 'annulled') {
            throw new \Exception('No se puede operar con un presupuesto anulado.');
        }
    }

    /**
     * Valida que el presupuesto no haya sido convertido previamente
     *
     * @param SaleHeader $budget
     * @throws \Exception
     */
    private function validateBudgetNotConverted(SaleHeader $budget): void
    {
        if ($budget->status === 'converted') {
            throw new \Exception('Este presupuesto ya fue convertido a venta.');
        }
    }

    /**
     * Valida que el usuario tenga permisos para gestionar presupuestos
     *
     * @param int $userId
     * @throws \Exception
     */
    private function validateBudgetManagementPermission(int $userId): void
    {
        $user = \App\Models\User::find($userId);

        if (!$user) {
            throw new \Exception('Usuario no encontrado.');
        }

        if (!$user->hasPermission('gestionar_presupuestos')) {
            throw new \Exception('No tiene permisos para gestionar presupuestos.');
        }
    }

    /**
     * Valida que el tipo de comprobante de destino no sea un presupuesto
     *
     * @param ReceiptType $receiptType
     * @throws \Exception
     */
    private function validateNotBudgetReceiptType(ReceiptType $receiptType): void
    {
        if (AfipConstants::isPresupuesto($receiptType->afip_code)) {
            throw new \Exception('Debe seleccionar un tipo de comprobante diferente a presupuesto.');
        }
    }

    /**
     * Obtiene el próximo número de comprobante para una sucursal y tipo.
     * Presupuesto (016): secuencia propia por tipo. Cualquier otro tipo: secuencia contigua
     * única por sucursal (todas las ventas no-presupuesto comparten 1, 2, 3...).
     *
     * @param int $branchId
     * @param int $receiptTypeId
     * @return string Número de 8 dígitos con ceros a la izquierda
     */
    private function getNextReceiptNumberForBranch(int $branchId, int $receiptTypeId): string
    {
        $receiptType = ReceiptType::find($receiptTypeId);

        if ($receiptType && AfipConstants::isPresupuesto($receiptType->afip_code)) {
            // Presupuesto: secuencia por (sucursal + tipo)
            $lastSale = SaleHeader::where('branch_id', $branchId)
                ->where('receipt_type_id', $receiptTypeId)
                ->orderByRaw('CAST(receipt_number AS UNSIGNED) DESC')
                ->lockForUpdate()
                ->first();
            $next = $lastSale ? ((int) $lastSale->receipt_number) + 1 : 1;
        } else {
            // Cualquier otro tipo: secuencia contigua única por sucursal (todas las ventas no-presupuesto)
            $presupuestoTypeIds = ReceiptType::where('afip_code', AfipConstants::RECEIPT_CODE_PRESUPUESTO)
                ->pluck('id')
                ->all();
            $lastSale = SaleHeader::where('branch_id', $branchId)
                ->whereNotIn('receipt_type_id', $presupuestoTypeIds)
                ->orderByRaw('CAST(receipt_number AS UNSIGNED) DESC')
                ->lockForUpdate()
                ->first();
            $next = $lastSale ? ((int) $lastSale->receipt_number) + 1 : 1;
        }

        return str_pad((string) $next, AfipConstants::RECEIPT_NUMBER_PADDING, '0', STR_PAD_LEFT);
    }

    /**
     * Genera el siguiente número de comprobante (delega en getNextReceiptNumberForBranch).
     *
     * @param int $branchId
     * @param int $receiptTypeId
     * @return string
     */
    private function generateNextReceiptNumber(int $branchId, int $receiptTypeId): string
    {
        return $this->getNextReceiptNumberForBranch($branchId, $receiptTypeId);
    }

    /**
     * Copia los items de un presupuesto a una venta
     *
     * @param SaleHeader $source
     * @param SaleHeader $destination
     */
    private function copyBudgetItems(SaleHeader $source, SaleHeader $destination): void
    {
        $stockService = app(\App\Services\StockService::class);

        foreach ($source->items as $item) {
            $destination->items()->create([
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'item_subtotal' => $item->item_subtotal,
                'item_iva' => $item->item_iva,
                'item_total' => $item->item_total,
                'iva_rate' => $item->iva_rate,
                'iva_id' => $item->iva_id,
                'discount_type' => $item->discount_type,
                'discount_value' => $item->discount_value,
                'discount_amount' => $item->discount_amount,
            ]);

            // Reducir stock
            $stockService->reduceStockByProductAndBranch(
                $item->product_id,
                $destination->branch_id,
                $item->quantity
            );
        }
    }

    /**
     * Copia los IVAs de un presupuesto a una venta
     *
     * @param SaleHeader $source
     * @param SaleHeader $destination
     */
    private function copyBudgetIvas(SaleHeader $source, SaleHeader $destination): void
    {
        if (!$source->saleIvas) {
            return;
        }

        foreach ($source->saleIvas as $iva) {
            $destination->saleIvas()->create([
                'iva_id' => $iva->iva_id,
                'iva_rate' => $iva->iva_rate,
                'base_amount' => $iva->base_amount,
                'iva_amount' => $iva->iva_amount,
            ]);
        }
    }

    /**
     * Copia los métodos de pago de un presupuesto a una venta
     *
     * @param SaleHeader $source
     * @param SaleHeader $destination
     */
    private function copyBudgetPayments(SaleHeader $source, SaleHeader $destination): void
    {
        if (!$source->salePayments || $source->salePayments->count() === 0) {
            return;
        }

        foreach ($source->salePayments as $payment) {
            $destination->salePayments()->create([
                'payment_method_id' => $payment->payment_method_id,
                'amount' => $payment->amount,
            ]);
        }
    }
}