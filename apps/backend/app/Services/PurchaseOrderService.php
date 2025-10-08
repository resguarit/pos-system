<?php

namespace App\Services;

// ... (las sentencias 'use' se mantienen igual que en el paso anterior)
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Interfaces\PurchaseOrderServiceInterface;
use App\Interfaces\StockServiceInterface;
use App\Interfaces\ProductServiceInterface; 
use App\Services\PricingService;
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
        return PurchaseOrder::with(['supplier', 'branch', 'items.product'])->findOrFail($id);
    }

    // ...

public function createPurchaseOrder(array $data)
{
    DB::beginTransaction();

    try {
        $purchaseOrder = PurchaseOrder::create([
            'supplier_id' => $data['supplier_id'],
            'branch_id' => $data['branch_id'],
            'payment_method_id' => $data['payment_method_id'] ?? null,
            'currency' => $data['currency'] ?? 'ARS', // Agregar currency
            'order_date' => $data['order_date'] ?? now(),
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
            'total_amount' => 0,
            'affects_cash_register' => $data['affects_cash_register'] ?? true, // Por defecto true
        ]);

        $totalAmount = 0;

        foreach ($data['items'] as $itemData) {
            
            $product = $this->productService->getProductById($itemData['product_id']);
            if (!$product) {
                throw new Exception("Producto con ID {$itemData['product_id']} no encontrado.");
            }

            // --- PRECIOS Y PROVEEDORES TENTATIVOS ---
            
            // Registrar información tentativa, NO actualizar nada
            $newSupplierId = (int)$data['supplier_id'];
            $newPurchasePrice = (float)$itemData['purchase_price'];
            
            if ((int)$product->supplier_id != $newSupplierId) {
                Log::info("Producto ID {$product->id} - proveedor tentativo: {$newSupplierId} (actual: {$product->supplier_id}). Se aplicará al completar la orden.");
            }
            
            if ((float)$product->unit_price != $newPurchasePrice) {
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

        return $purchaseOrder->fresh(['supplier', 'branch', 'items.product']);
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
            if (isset($data['payment_method_id'])) {
                $purchaseOrder->payment_method_id = $data['payment_method_id'];
            }
            if (array_key_exists('affects_cash_register', $data)) {
                $purchaseOrder->affects_cash_register = $data['affects_cash_register'];
            }
            $purchaseOrder->save();

            // 2) Upsert de ítems si vienen en la request
            if (isset($data['items']) && is_array($data['items'])) {
                $existingItems = $purchaseOrder->items()->get()->keyBy('product_id');
                $incomingProductIds = [];
                $totalAmount = 0;

                foreach ($data['items'] as $itemData) {
                    $productId = (int)$itemData['product_id'];
                    $qty = (int)$itemData['quantity'];
                    $price = (float)$itemData['purchase_price'];
                    $incomingProductIds[] = $productId;

                    // Registrar datos tentativos del producto (NO actualizar hasta completar)
                    $product = $this->productService->getProductById($productId);
                    if (!$product) {
                        throw new Exception("Producto con ID {$productId} no encontrado.");
                    }
                    
                    // Log del proveedor tentativo (NO se actualiza hasta completar)
                    $newSupplierId = (int)($data['supplier_id'] ?? $purchaseOrder->supplier_id);
                    if ((int)$product->supplier_id !== $newSupplierId) {
                        Log::info("Producto ID {$product->id} - proveedor tentativo: {$newSupplierId} (actual: {$product->supplier_id}). Se aplicará al completar la orden.");
                    }
                    
                    // Log del precio tentativo (NO se actualiza hasta completar)
                    if ((float)$product->unit_price !== $price) {
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
            return $purchaseOrder->fresh(['supplier', 'branch', 'items.product']);
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

    public function completePurchaseOrder($id, $paymentMethodId = null)
    {
        DB::beginTransaction();

        try {
            $purchaseOrder = PurchaseOrder::with(['items.product', 'branch', 'supplier'])->findOrFail($id);

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
                if ((float)$product->unit_price !== (float)$orderPrice) {
                    $updateData['unit_price'] = $orderPrice;
                    $shouldRecalculatePrice = true;
                    Log::info("Producto ID {$product->id} - precio actualizado de {$product->unit_price} a {$orderPrice} al completar orden {$purchaseOrder->id}");
                }
                
                // Actualizar proveedor si es diferente
                if ((int)$product->supplier_id !== (int)$orderSupplierId) {
                    $updateData['supplier_id'] = $orderSupplierId;
                    Log::info("Producto ID {$product->id} - proveedor actualizado de {$product->supplier_id} a {$orderSupplierId} al completar orden {$purchaseOrder->id}");
                }
                
                // Solo hacer la actualización si hay cambios
                if (!empty($updateData)) {
                    $this->productService->updateProduct($product->id, $updateData);
                    
                    // Si cambió el precio unitario, recalcular el precio de venta manteniendo el markup
                    if ($shouldRecalculatePrice) {
                        $this->recalculateSalePriceMaintainingMarkup($product, $orderPrice);
                    }
                }
                
                // Actualizar stock
                $this->updateStock(
                    $item->product_id,
                    $purchaseOrder->branch_id,
                    $item->quantity
                );
            }

            // Registrar movimiento de caja usando el payment_method_id de la orden
            $this->registerPurchaseCashMovement($purchaseOrder, $purchaseOrder->payment_method_id);

            $purchaseOrder->update(['status' => 'completed']);

            DB::commit();

            return $purchaseOrder;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Registra el movimiento de caja cuando se completa una orden de compra
     */
    private function registerPurchaseCashMovement(PurchaseOrder $purchaseOrder, $paymentMethodId = null): void
    {
        try {
            // Verificar si ya existe un movimiento para esta orden (evitar duplicados)
            $existingMovement = \App\Models\CashMovement::where('reference_type', 'purchase_order')
                ->where('reference_id', $purchaseOrder->id)
                ->first();
            
            if ($existingMovement) {
                Log::info("Ya existe un movimiento de caja para la orden {$purchaseOrder->id}. Saltando creación.");
                return;
            }
            
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
            $amountInARS = $purchaseOrder->total_amount;
            $currency = $purchaseOrder->currency ?? 'ARS';
            
            if ($currency === 'USD') {
                // Convertir USD a ARS usando la tasa actual
                try {
                    $exchangeRate = \App\Models\ExchangeRate::getCurrentRate('USD', 'ARS');
                    if ($exchangeRate && $exchangeRate > 0) {
                        $amountInARS = $purchaseOrder->total_amount * $exchangeRate;
                        Log::info("Orden {$purchaseOrder->id} - Convertido \${$purchaseOrder->total_amount} USD a \${$amountInARS} ARS (tasa: {$exchangeRate})");
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
                $formattedUSD = number_format($purchaseOrder->total_amount, 2, '.', ',');
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
                'reference_type'   => 'purchase_order',
                'reference_id'     => $purchaseOrder->id,
                'amount'           => $amountInARS, // Siempre en ARS
                'description'      => $description,
                'user_id'          => $userId,
                'affects_balance'  => $affectsBalance, // Usar el valor de la orden
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
}