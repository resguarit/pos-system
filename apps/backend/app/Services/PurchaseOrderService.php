<?php

namespace App\Services;

// ... (las sentencias 'use' se mantienen igual que en el paso anterior)
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderPayment;
use App\Models\PurchaseOrderItem;
use App\Interfaces\PurchaseOrderServiceInterface;
use App\Interfaces\StockServiceInterface;
use App\Interfaces\ProductServiceInterface;
use App\Services\PricingService;
use App\Services\ProductCostHistoryService;
use App\Constants\ProductCostHistorySourceTypes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class PurchaseOrderService implements PurchaseOrderServiceInterface
{
    protected $stockService;
    protected $productService;
    protected $pricingService;

    public function __construct(
        StockServiceInterface $stockService,
        ProductServiceInterface $productService,
        PricingService $pricingService
    ) {
        $this->stockService = $stockService;
        $this->productService = $productService;
        $this->pricingService = $pricingService;
    }

    // ... otros métodos ...

    public function getAllPurchaseOrders(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'branch', 'items.product']);

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->input('supplier_id'));
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getPurchaseOrderById($id)
    {
        return PurchaseOrder::with(['supplier', 'branch', 'items.product', 'payments.paymentMethod'])->findOrFail($id);
    }

    // ...

    public function createPurchaseOrder(array $data)
    {
        DB::beginTransaction();

        try {
            $purchaseOrder = PurchaseOrder::create([
                'supplier_id' => $data['supplier_id'],
                'branch_id' => $data['branch_id'],
                'payment_method_id' => null, // Deprecated, using payments table
                'currency' => $data['currency'] ?? 'ARS', // Agregar currency
                'order_date' => $data['order_date'] ?? now(),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'total_amount' => 0,
                'affects_cash_register' => $data['affects_cash_register'] ?? true, // Por defecto true
            ]);

            // Save payments
            if (isset($data['payments']) && is_array($data['payments'])) {
                foreach ($data['payments'] as $payment) {
                    PurchaseOrderPayment::create([
                        'purchase_order_id' => $purchaseOrder->id,
                        'payment_method_id' => $payment['payment_method_id'],
                        'amount' => $payment['amount'],
                    ]);
                }
            } elseif (isset($data['payment_method_id'])) {
                // Fallback for backward compatibility
                // We don't have the amount here usually, but if we do... 
                // Actually the old dialog sent payment_method_id. 
                // But the new one will send payments.
                // If we receive only payment_method_id, we can't create a payment record yet because we don't know the total amount accurately until items are processed?
                // Or we wait until update? 
                // For now, let's assume the frontend sends 'payments'. 
                // If not, we might fail to save payments.
                // Let's add a basic fallback if 'total_amount' was passed (it's 0 usually).
                // Better to just rely on the new frontend sending 'payments'.
            }

            $totalAmount = 0;

            foreach ($data['items'] as $itemData) {

                $product = $this->productService->getProductById($itemData['product_id']);
                if (!$product) {
                    throw new Exception("Producto con ID {$itemData['product_id']} no encontrado.");
                }

                // --- PRECIOS Y PROVEEDORES TENTATIVOS ---

                // Registrar información tentativa, NO actualizar nada
                $newSupplierId = (int) $data['supplier_id'];
                $newPurchasePrice = (float) $itemData['purchase_price'];

                if ((int) $product->supplier_id != $newSupplierId) {
                    Log::info("Producto ID {$product->id} - proveedor tentativo: {$newSupplierId} (actual: {$product->supplier_id}). Se aplicará al completar la orden.");
                }

                if ((float) $product->unit_price != $newPurchasePrice) {
                    Log::info("Producto ID {$product->id} - precio tentativo: {$newPurchasePrice} (actual: {$product->unit_price}). Se aplicará al completar la orden.");
                }
                // --- FIN DE LA LÓGICA TENTATIVA ---

                $subtotal = $itemData['quantity'] * $itemData['purchase_price'];

                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $itemData['product_id'],
                    'quantity' => $itemData['quantity'],
                    'purchase_price' => $itemData['purchase_price'],
                    'subtotal' => $subtotal,
                ]);

                $totalAmount += $subtotal;
            }

            $purchaseOrder->update(['total_amount' => $totalAmount]);

            // Verificar que el total se guardó correctamente
            $calculatedTotal = $purchaseOrder->fresh()->calculateTotal();
            if (abs($totalAmount - $calculatedTotal) > 0.01) {
                Log::warning("Discrepancia en total de orden {$purchaseOrder->id}: Guardado: {$totalAmount}, Calculado: {$calculatedTotal}");
            }

            // NO registrar movimiento de caja aquí - se registrará al completar la orden
            // $this->registerPurchaseCashMovement($purchaseOrder, $purchaseOrder->payment_method_id);

            DB::commit();

            return $purchaseOrder->fresh(['supplier', 'branch', 'items.product', 'payments.paymentMethod']);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creando la orden de compra via Service: " . $e->getMessage());
            throw $e;
        }
    }

    public function updatePurchaseOrder($id, array $data)
    {
        $purchaseOrder = PurchaseOrder::with(['items'])->findOrFail($id);

        if ($purchaseOrder->status === 'completed') {
            throw new Exception('Cannot update a completed purchase order');
        }

        DB::beginTransaction();
        try {
            // 1) Actualizar cabecera
            $purchaseOrder->supplier_id = $data['supplier_id'] ?? $purchaseOrder->supplier_id;
            $purchaseOrder->branch_id = $data['branch_id'] ?? $purchaseOrder->branch_id;
            if (isset($data['order_date'])) {
                $purchaseOrder->order_date = $data['order_date'];
            }
            if (array_key_exists('notes', $data)) {
                $purchaseOrder->notes = $data['notes'];
            }
            // payment_method_id deprecated field update removed

            if (array_key_exists('affects_cash_register', $data)) {
                $purchaseOrder->affects_cash_register = $data['affects_cash_register'];
            }
            $purchaseOrder->save();

            // Update Payments
            if (isset($data['payments']) && is_array($data['payments'])) {
                // Delete existing payments
                $purchaseOrder->payments()->delete();

                // Create new payments
                foreach ($data['payments'] as $payment) {
                    $purchaseOrder->payments()->create([
                        'payment_method_id' => $payment['payment_method_id'],
                        'amount' => $payment['amount'],
                    ]);
                }
            }

            // 2) Upsert de ítems si vienen en la request
            if (isset($data['items']) && is_array($data['items'])) {
                $existingItems = $purchaseOrder->items()->get()->keyBy('product_id');
                $incomingProductIds = [];
                $totalAmount = 0;

                foreach ($data['items'] as $itemData) {
                    $productId = (int) $itemData['product_id'];
                    $qty = (int) $itemData['quantity'];
                    $price = (float) $itemData['purchase_price'];
                    $incomingProductIds[] = $productId;

                    // Registrar datos tentativos del producto (NO actualizar hasta completar)
                    $product = $this->productService->getProductById($productId);
                    if (!$product) {
                        throw new Exception("Producto con ID {$productId} no encontrado.");
                    }

                    // Log del proveedor tentativo (NO se actualiza hasta completar)
                    $newSupplierId = (int) ($data['supplier_id'] ?? $purchaseOrder->supplier_id);
                    if ((int) $product->supplier_id !== $newSupplierId) {
                        Log::info("Producto ID {$product->id} - proveedor tentativo: {$newSupplierId} (actual: {$product->supplier_id}). Se aplicará al completar la orden.");
                    }

                    // Log del precio tentativo (NO se actualiza hasta completar)
                    if ((float) $product->unit_price !== $price) {
                        Log::info("Producto ID {$product->id} - precio tentativo: {$price} (actual: {$product->unit_price}). Se aplicará al completar la orden.");
                    }

                    // Upsert por product_id
                    if ($existingItems->has($productId)) {
                        $item = $existingItems->get($productId);
                        $item->quantity = $qty;
                        $item->purchase_price = $price;
                        // subtotal se recalcula en el evento saving del modelo
                        $item->save();
                    } else {
                        PurchaseOrderItem::create([
                            'purchase_order_id' => $purchaseOrder->id,
                            'product_id' => $productId,
                            'quantity' => $qty,
                            'purchase_price' => $price,
                            'subtotal' => $qty * $price,
                        ]);
                    }

                    $totalAmount += $qty * $price;
                }

                // Eliminar ítems que ya no vienen
                $purchaseOrder->items()
                    ->whereNotIn('product_id', $incomingProductIds)
                    ->delete();

                // Actualizar total
                $purchaseOrder->update(['total_amount' => $totalAmount]);
            } else {
                // Recalcular total si no se enviaron items
                $recalculatedTotal = $purchaseOrder->fresh(['items'])->calculateTotal();
                $purchaseOrder->update(['total_amount' => $recalculatedTotal]);
            }

            DB::commit();
            return $purchaseOrder->fresh(['supplier', 'branch', 'items.product', 'payments.paymentMethod']);
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function deletePurchaseOrder($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if ($purchaseOrder->status === 'completed') {
            throw new Exception('Cannot delete a completed purchase order');
        }

        $purchaseOrder->delete();
        return $purchaseOrder;
    }

    public function completePurchaseOrder($id, $paymentMethodId = null) // $paymentMethodId kept for interface compatibility but ignored
    {
        DB::beginTransaction();

        try {
            $purchaseOrder = PurchaseOrder::with(['items.product', 'branch', 'supplier', 'payments'])->findOrFail($id);

            if ($purchaseOrder->status === 'completed') {
                throw new Exception('Purchase order is already completed');
            }

            // Update stock and product prices for each item
            foreach ($purchaseOrder->items as $item) {
                $product = $item->product;
                $orderPrice = $item->purchase_price;
                $orderSupplierId = $purchaseOrder->supplier_id;

                $updateData = [];
                $shouldRecalculatePrice = false;

                // Actualizar precio unitario
                if ((float) $product->unit_price !== (float) $orderPrice) {
                    $updateData['unit_price'] = $orderPrice;
                    $shouldRecalculatePrice = true;
                    Log::info("Producto ID {$product->id} - precio actualizado de {$product->unit_price} a {$orderPrice} al completar orden {$purchaseOrder->id}");
                }

                // Actualizar proveedor si es diferente
                if ((int) $product->supplier_id !== (int) $orderSupplierId) {
                    $updateData['supplier_id'] = $orderSupplierId;
                    Log::info("Producto ID {$product->id} - proveedor actualizado de {$product->supplier_id} a {$orderSupplierId} al completar orden {$purchaseOrder->id}");
                }

                // Solo hacer la actualización si hay cambios
                if (!empty($updateData)) {
                    // Actualizar producto omitiendo el registro automático de historial
                    // porque lo registraremos manualmente con el sourceType correcto
                    $this->productService->updateProduct($product->id, $updateData, true); // skipCostHistory = true

                    // Si cambió el precio unitario, recalcular el precio de venta manteniendo el markup
                    if ($shouldRecalculatePrice) {
                        $this->recalculateSalePriceMaintainingMarkup($product, $orderPrice);

                        // Registrar historial de costo con el sourceType correcto
                        try {
                            $costHistoryService = app(ProductCostHistoryService::class);
                            $supplierName = $purchaseOrder->supplier ? $purchaseOrder->supplier->name : 'N/A';
                            $costHistoryService->recordCostChange(
                                $product->fresh(), // Obtener el producto actualizado
                                (float) $orderPrice,
                                ProductCostHistorySourceTypes::PURCHASE_ORDER,
                                $purchaseOrder->id,
                                "Orden de compra #{$purchaseOrder->id} - Proveedor: {$supplierName}",
                                (float) $product->unit_price // Pasar el costo anterior antes de la actualización
                            );
                        } catch (Exception $e) {
                            Log::error("Error registrando historial de costo al completar orden {$purchaseOrder->id} para producto {$product->id}: " . $e->getMessage());
                        }
                    }
                }

                // Actualizar stock
                $this->updateStock(
                    $item->product_id,
                    $purchaseOrder->branch_id,
                    $item->quantity
                );
            }

            // Registrar movimientos de caja O cuenta corriente para cada pago
            // Si la orden no tiene pagos registrados (legacy o error), intentar usar el paymentMethodId si viene o el de la orden (fallback)
            if ($purchaseOrder->payments->isEmpty()) {
                $pmId = $paymentMethodId ?? $purchaseOrder->payment_method_id;
                if ($pmId) {
                    $this->processPayment($purchaseOrder, $pmId, $purchaseOrder->total_amount);
                } else {
                    Log::warning("Orden {$purchaseOrder->id} completada sin pagos registrados.");
                }
            } else {
                foreach ($purchaseOrder->payments as $payment) {
                    $this->processPayment($purchaseOrder, $payment->payment_method_id, $payment->amount);
                }
            }

            $purchaseOrder->update(['status' => 'completed']);

            DB::commit();

            return $purchaseOrder;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Procesa un pago individual: decide si va a caja o cuenta corriente
     */
    private function processPayment(PurchaseOrder $purchaseOrder, $paymentMethodId, $amount)
    {
        $paymentMethod = \App\Models\PaymentMethod::find($paymentMethodId);
        if (!$paymentMethod) {
            Log::warning("Método de pago {$paymentMethodId} no encontrado para orden {$purchaseOrder->id}.");
            return;
        }

        // Verificar si es Cuenta Corriente
        // Buscamos por nombre "Cuenta Corriente" (o similar)
        // Idealmente tendríamos un flag en payment_method, pero por seeder sabemos el nombre
        $isCurrentAccount = stripos($paymentMethod->name, 'Cuenta Corriente') !== false;

        if ($isCurrentAccount) {
            $this->registerPurchaseCurrentAccountMovement($purchaseOrder, $paymentMethod, $amount);
        } else {
            // Es un pago estándar (Caja)
            $this->registerPurchaseCashMovement($purchaseOrder, $paymentMethodId, $amount);
        }
    }

    /**
     * Registra un movimiento en la cuenta corriente del proveedor
     */
    private function registerPurchaseCurrentAccountMovement(PurchaseOrder $purchaseOrder, $paymentMethod, $amount)
    {
        try {
            if ($amount <= 0)
                return;

            $supplier = $purchaseOrder->supplier;
            if (!$supplier) {
                Log::warning("Orden {$purchaseOrder->id} sin proveedor. No se puede registrar en Cuenta Corriente.");
                return;
            }

            // Buscar o Crear Cuenta Corriente para el Proveedor
            $currentAccount = \App\Models\CurrentAccount::firstOrCreate(
                ['supplier_id' => $supplier->id],
                [
                    'customer_id' => null, // Explícitamente null
                    'status' => 'active',
                    'current_balance' => 0,
                    'credit_limit' => null, // Sin límite por defecto para proveedores
                    'opened_at' => now(),
                    'notes' => 'Creada automáticamente al completar orden de compra #' . $purchaseOrder->id
                ]
            );

            // Buscar tipo de movimiento "Compra a Crédito" o crear si no existe
            $movementType = \App\Models\MovementType::firstOrCreate(
                ['name' => 'Compra a Crédito'],
                [
                    'description' => 'Compra realizada a cuenta corriente del proveedor',
                    'operation_type' => 'entrada', // Aumenta la deuda (balance positivo)
                    'is_cash_movement' => false,
                    'is_current_account_movement' => true,
                    'active' => true
                ]
            );

            $balanceBefore = $currentAccount->current_balance;
            $balanceAfter = $balanceBefore + $amount; // Aumentar deuda

            // Registrar Movimiento
            \App\Models\CurrentAccountMovement::create([
                'current_account_id' => $currentAccount->id,
                'movement_type_id' => $movementType->id,
                'amount' => $amount,
                'description' => "Compra #{$purchaseOrder->id}",
                'reference' => "PO-{$purchaseOrder->id}",
                'purchase_order_id' => $purchaseOrder->id,
                'sales_id' => null,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'movement_date' => now(),
                'user_id' => auth()->id()
            ]);

            // Actualizar Balance de la Cuenta
            $currentAccount->updateBalance($amount);

            Log::info("Movimiento de Cta. Cte. registrado para orden {$purchaseOrder->id}. Proveedor: {$supplier->name}. Monto: {$amount}. Nuevo saldo: {$balanceAfter}");

        } catch (Exception $e) {
            Log::error("Error registrando movimiento de Cta. Cte. para orden {$purchaseOrder->id}: " . $e->getMessage());
            // No interrumpir el flujo principal, pero loguear error grave
        }
    }

    /**
     * Registra un movimiento de caja para un pago de orden de compra
     */
    private function registerPurchaseCashMovement(PurchaseOrder $purchaseOrder, $paymentMethodId, $amount): void
    {
        try {
            // Validar que el monto sea mayor a 0
            if ($amount <= 0)
                return;

            // Determinar método de pago
            $paymentMethod = null;

            if ($paymentMethodId) {
                $paymentMethod = \App\Models\PaymentMethod::find($paymentMethodId);
            }

            if (!$paymentMethod) {
                Log::warning("Método de pago no encontrado para orden de compra {$purchaseOrder->id}. No se registrará movimiento de caja.");
                return;
            }

            // NUEVO: Siempre registrar movimiento, pero usar affects_cash_register de la orden para determines si afecta balance
            $affectsBalance = $purchaseOrder->affects_cash_register ?? true;
            Log::info("Registrando movimiento para orden {$purchaseOrder->id} con affects_balance: " . ($affectsBalance ? 'true' : 'false'));

            // Buscar el tipo de movimiento para compra en efectivo
            $movementType = \App\Models\MovementType::where('name', 'Compra en efectivo')
                ->where('operation_type', 'salida')
                ->where('is_cash_movement', true)
                ->where('active', true)
                ->first();

            if (!$movementType) {
                Log::warning("Tipo de movimiento 'Compra en efectivo' no encontrado. No se registrará movimiento de caja.");
                return;
            }

            // Buscar caja abierta para la sucursal
            $cashRegister = \App\Models\CashRegister::where('branch_id', $purchaseOrder->branch_id)
                ->where('status', 'open')
                ->first();

            if (!$cashRegister) {
                Log::warning("No hay caja abierta en la sucursal {$purchaseOrder->branch_id}. No se registrará movimiento de caja para la orden de compra {$purchaseOrder->id}.");
                return;
            }

            $cashMovementService = app(\App\Interfaces\CashMovementServiceInterface::class);

            // Calcular el monto en ARS (la caja siempre maneja ARS)
            $amountInARS = $amount;
            $currency = $purchaseOrder->currency ?? 'ARS';

            if ($currency === 'USD') {
                // Convertir USD a ARS usando la tasa actual
                try {
                    $exchangeRate = \App\Models\ExchangeRate::getCurrentRate('USD', 'ARS');
                    if ($exchangeRate && $exchangeRate > 0) {
                        $amountInARS = $amount * $exchangeRate;
                        Log::info("Orden {$purchaseOrder->id} - Convertido \${$amount} USD a \${$amountInARS} ARS (tasa: {$exchangeRate})");
                    } else {
                        Log::warning("No se pudo obtener tasa USD->ARS para orden {$purchaseOrder->id}. No se registrará movimiento de caja.");
                        return;
                    }
                } catch (\Exception $e) {
                    Log::error("Error convirtiendo USD a ARS para orden {$purchaseOrder->id}: {$e->getMessage()}");
                    return;
                }
            }

            // Crear descripción detallada
            $supplierName = $purchaseOrder->supplier ? $purchaseOrder->supplier->name : 'Proveedor N/A';
            $description = "Compra #{$purchaseOrder->id} - Proveedor: {$supplierName}";

            if ($currency === 'USD') {
                $formattedUSD = number_format($amount, 2, '.', ',');
                $formattedARS = number_format($amountInARS, 2, '.', ',');
                $formattedRate = number_format($exchangeRate, 2, '.', ',');
                $description .= " | USD \${$formattedUSD} → ARS \${$formattedARS} (TC: \${$formattedRate})";
            }

            // Agregar indicación si no afecta la caja
            if (!$affectsBalance) {
                $description .= " - NO afecta balance de caja";
            }

            // Obtener un usuario válido
            $userId = auth()->id();
            if (!$userId) {
                $firstUser = \App\Models\User::first();
                $userId = $firstUser ? $firstUser->id : null;
            }

            if (!$userId) {
                Log::warning("No se pudo obtener un usuario válido para el movimiento de caja de la orden {$purchaseOrder->id}");
                return;
            }

            $cashMovementService->createMovement([
                'cash_register_id' => $cashRegister->id,
                'movement_type_id' => $movementType->id,
                'payment_method_id' => $paymentMethod->id,
                'reference_type' => 'purchase_order',
                'reference_id' => $purchaseOrder->id,
                'amount' => $amountInARS, // Siempre en ARS
                'description' => $description,
                'user_id' => $userId,
                'affects_balance' => $affectsBalance, // Usar el valor de la orden
            ]);

            $balanceStatus = $affectsBalance ? 'afecta el balance' : 'NO afecta el balance';
            Log::info("Movimiento de caja registrado para orden de compra {$purchaseOrder->id} por \${$amountInARS} ARS con método de pago: {$paymentMethod->name} - {$balanceStatus}");

        } catch (\Exception $e) {
            Log::error("Error al registrar movimiento de caja para orden de compra {$purchaseOrder->id}: " . $e->getMessage());
            // No lanzamos excepción para no fallar la completación de la orden
        }
    }

    public function cancelPurchaseOrder($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if ($purchaseOrder->status === 'completed') {
            throw new Exception('Cannot cancel a completed purchase order');
        }

        $purchaseOrder->update(['status' => 'cancelled']);
        return $purchaseOrder;
    }

    private function updateStock($productId, $branchId, $quantity)
    {
        // Check if stock record exists
        $stock = $this->stockService->getStockByProductAndBranch($productId, $branchId);

        if ($stock) {
            // Update existing stock
            $newQuantity = $stock->current_stock + $quantity;
            $this->stockService->updateStockQuantity($stock->id, $newQuantity);
        } else {
            // Create new stock record
            $this->stockService->createStock([
                'product_id' => $productId,
                'branch_id' => $branchId,
                'current_stock' => $quantity,
                'min_stock' => 0,
                'max_stock' => 0,
            ]);
        }
    }

    /**
     * Recalcula el precio de venta manteniendo el markup existente
     * SRP: Responsabilidad única de recalcular precios
     * OCP: Abierto para extensión con diferentes estrategias de cálculo
     */
    private function recalculateSalePriceMaintainingMarkup($product, $newUnitPrice)
    {
        try {
            // Obtener el markup actual del producto
            $currentMarkup = $product->markup ?? 0;
            $currency = $product->currency ?? 'ARS';
            $ivaId = $product->iva_id ?? null;

            // Obtener la tasa de IVA si existe
            $ivaRate = null;
            if ($ivaId) {
                $iva = \App\Models\Iva::find($ivaId);
                $ivaRate = $iva ? $iva->rate / 100 : null;
            }

            // Calcular el nuevo precio de venta manteniendo el markup
            $newSalePrice = $this->pricingService->calculateSalePrice(
                $newUnitPrice,
                $currency,
                $currentMarkup,
                $ivaRate
            );

            // Actualizar el precio de venta en la base de datos
            $this->productService->updateProduct($product->id, [
                'sale_price' => $newSalePrice
            ]);

            Log::info("Producto ID {$product->id} - precio de venta recalculado de {$product->sale_price} a {$newSalePrice} manteniendo markup {$currentMarkup}");

        } catch (\Exception $e) {
            Log::error("Error recalculando precio de venta para producto {$product->id}: " . $e->getMessage());
            // No lanzar excepción para no interrumpir el proceso de completar la orden
        }
    }

    /**
     * Get preview data for cancelling a completed purchase order
     * Returns stock changes and cash movement info
     */
    public function getCancellationPreview($id)
    {
        $purchaseOrder = PurchaseOrder::with(['supplier', 'branch', 'items.product'])->findOrFail($id);

        if ($purchaseOrder->status !== 'completed') {
            throw new Exception('Only completed purchase orders can have a cancellation preview');
        }

        $stockChanges = [];
        foreach ($purchaseOrder->items as $item) {
            $stock = $this->stockService->getStockByProductAndBranch(
                $item->product_id,
                $purchaseOrder->branch_id
            );

            $currentStock = $stock ? $stock->current_stock : 0;
            $stockAfterRevert = $currentStock - $item->quantity;

            $stockChanges[] = [
                'product_id' => $item->product_id,
                'product_name' => $item->product ? $item->product->description : "Producto #{$item->product_id}",
                'quantity_to_revert' => $item->quantity,
                'current_stock' => $currentStock,
                'stock_after_revert' => $stockAfterRevert,
                'will_be_negative' => $stockAfterRevert < 0,
            ];
        }

        return [
            'order' => [
                'id' => $purchaseOrder->id,
                'supplier_name' => $purchaseOrder->supplier ? $purchaseOrder->supplier->name : 'N/A',
                'branch_name' => $purchaseOrder->branch ? $purchaseOrder->branch->description : 'N/A',
                'order_date' => $purchaseOrder->order_date,
                'total_amount' => $purchaseOrder->total_amount ?? 0,
                'currency' => $purchaseOrder->currency ?? 'ARS',
            ],
            'stock_changes' => $stockChanges,
            'cash_movements' => \App\Models\CashMovement::where('reference_type', 'purchase_order')
                ->where('reference_id', $purchaseOrder->id)
                ->with(['paymentMethod'])
                ->get()
                ->map(function ($movement) {
                    return [
                        'id' => $movement->id,
                        'amount' => (float) $movement->amount,
                        'payment_method' => $movement->paymentMethod ? $movement->paymentMethod->name : 'N/A',
                        'affects_balance' => $movement->affects_balance,
                        'description' => $movement->description,
                    ];
                }),
        ];
    }

    /**
     * Cancel a completed purchase order
     * Reverts stock, deletes cash movement, logs activity
     */
    public function cancelCompletedPurchaseOrder($id)
    {
        DB::beginTransaction();

        try {
            $purchaseOrder = PurchaseOrder::with(['items.product', 'supplier', 'branch', 'payments'])->findOrFail($id);

            if ($purchaseOrder->status !== 'completed') {
                throw new Exception('Only completed purchase orders can be cancelled with reversion');
            }

            $stockReverted = [];
            $cashMovementDeleted = false;

            // 1. Revertir stock de cada item
            Log::info("Iniciando reversión de stock para orden #{$purchaseOrder->id}");
            foreach ($purchaseOrder->items as $item) {
                $stock = $this->stockService->getStockByProductAndBranch(
                    $item->product_id,
                    $purchaseOrder->branch_id
                );

                if ($stock) {
                    $oldStock = $stock->current_stock;
                    $newStock = $oldStock - $item->quantity;
                    $this->stockService->updateStockQuantity($stock->id, $newStock);

                    $stockReverted[] = [
                        'product_id' => $item->product_id,
                        'old_stock' => $oldStock,
                        'new_stock' => $newStock,
                        'quantity_reverted' => $item->quantity,
                    ];

                    Log::info("Producto #{$item->product_id}: stock {$oldStock} → {$newStock} (revertido {$item->quantity})");
                }
            }

            // 2. Actualizar movimientos de caja asociados (marcarlos como informativos)
            $cashMovements = \App\Models\CashMovement::where('reference_type', 'purchase_order')
                ->where('reference_id', $purchaseOrder->id)
                ->get();

            $updatedMovementsCount = 0;

            foreach ($cashMovements as $cashMovement) {
                // Solo actualizar si afectaba el balance, para no marcar doble
                if ($cashMovement->affects_balance) {
                    $cashMovement->update([
                        'affects_balance' => false,
                        'description' => "[CANCELADO] " . $cashMovement->description
                    ]);
                    $updatedMovementsCount++;
                    Log::info("Movimiento de caja #{$cashMovement->id} actualizado a informativo (monto: {$cashMovement->amount})");
                }
            }

            // 3. Actualizar estado de la orden y agregar nota
            $currentNotes = $purchaseOrder->notes ?? '';
            $reversionNote = "\n\n[CANCELADA " . now()->format('Y-m-d H:i:s') . "] - Orden revertida:\n";
            $reversionNote .= "- Stock revertido para " . count($stockReverted) . " productos\n";
            $reversionNote .= $updatedMovementsCount > 0 ? "- {$updatedMovementsCount} Movimiento(s) de caja marcado(s) como informativo(s)\n" : "- No había movimientos de caja activos\n";
            $reversionNote .= "- NOTA: Los costos de los productos NO fueron revertidos";

            // Usar DB::table para evitar restricciones del método update del modelo
            DB::table('purchase_orders')->where('id', $purchaseOrder->id)->update([
                'status' => 'cancelled',
                'notes' => $currentNotes . $reversionNote,
                'updated_at' => now(),
            ]);

            // 4. Registrar en activity log
            DB::table('activity_log')->insert([
                'log_name' => 'purchase_order',
                'description' => 'Completed order cancelled and reverted',
                'subject_type' => 'App\\Models\\PurchaseOrder',
                'subject_id' => $purchaseOrder->id,
                'causer_type' => auth()->check() ? 'App\\Models\\User' : null,
                'causer_id' => auth()->id(),
                'properties' => json_encode([
                    'action' => 'cancel_completed',
                    'executed_at' => now()->toDateTimeString(),
                    'stock_reverted' => $stockReverted,
                    'cash_movements_updated_count' => $updatedMovementsCount,
                    'order_total' => $purchaseOrder->total_amount,
                    'currency' => $purchaseOrder->currency,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Orden de compra #{$purchaseOrder->id} cancelada y revertida exitosamente");

            DB::commit();

            return $purchaseOrder->fresh(['supplier', 'branch', 'items.product']);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error cancelando orden de compra completada {$id}: " . $e->getMessage());
            throw $e;
        }
    }
}