<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SaleHeader;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\CurrentAccountMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class UpdateSalePricesService
{
    /**
     * Vista previa de actualización de precio para una venta individual
     * 
     * @param int $saleId ID de la venta
     * @return array Detalles de cambios de precio
     * @throws Exception Si la venta no se puede actualizar
     */
    public function previewSalePriceUpdate(int $saleId): array
    {
        $sale = SaleHeader::with(['items.product', 'customer'])->findOrFail($saleId);

        // Validar que la venta se puede actualizar
        $this->validateSaleCanBeUpdated($sale);

        $itemsPreview = [];
        $newSubtotal = 0;
        $newTotalIva = 0;

        foreach ($sale->items as $item) {
            // Obtener precio actual del producto
            $product = $item->product;

            if (!$product) {
                throw new Exception("Producto no encontrado para el ítem de venta #{$item->id}");
            }

            $oldPrice = (float) $item->unit_price;
            $newPrice = (float) $product->sale_price;
            $quantity = (float) $item->quantity;

            // Calcular nuevos valores
            $newItemSubtotal = $newPrice * $quantity;
            $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);
            $newItemTotal = $newItemSubtotal + $newItemIva;

            // Aplicar descuento si existe
            $discountAmount = 0;
            if ($item->discount_type && $item->discount_value > 0) {
                if ($item->discount_type === 'percentage') {
                    $discountAmount = $newItemSubtotal * ((float) $item->discount_value / 100);
                } else {
                    $discountAmount = (float) $item->discount_value;
                }
                $newItemSubtotal -= $discountAmount;
                $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);
                $newItemTotal = $newItemSubtotal + $newItemIva;
            }

            $itemsPreview[] = [
                'id' => $item->id,
                'product_name' => $product->description,
                'quantity' => $quantity,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'price_change' => $newPrice - $oldPrice,
                'price_change_percentage' => $oldPrice > 0 ? (($newPrice - $oldPrice) / $oldPrice) * 100 : 0,
                'old_total' => (float) $item->item_total,
                'new_total' => $newItemTotal,
            ];

            $newSubtotal += $newItemSubtotal;
            $newTotalIva += $newItemIva;
        }

        // Aplicar descuento global de la venta si existe
        $globalDiscount = 0;
        if ($sale->discount_type && $sale->discount_value > 0) {
            if ($sale->discount_type === 'percentage') {
                $globalDiscount = $newSubtotal * ((float) $sale->discount_value / 100);
            } else {
                $globalDiscount = (float) $sale->discount_value;
            }
        }

        $newSubtotal -= $globalDiscount;
        $newTotalIva = $newSubtotal * ($newTotalIva / ($newSubtotal + $globalDiscount)); // Recalcular IVA proporcional

        $newTotal = $newSubtotal + $newTotalIva + (float) $sale->iibb + (float) $sale->internal_tax;

        $oldTotal = (float) $sale->total;
        $paidAmount = (float) $sale->paid_amount;

        return [
            'can_update' => true,
            'sale_id' => $sale->id,
            'receipt_number' => $sale->receipt_number,
            'customer_name' => $sale->customer ? $sale->customer->person->first_name . ' ' . $sale->customer->person->last_name : 'Cliente General',
            'items' => $itemsPreview,
            'old_subtotal' => (float) $sale->subtotal,
            'new_subtotal' => $newSubtotal,
            'old_total_iva' => (float) $sale->total_iva_amount,
            'new_total_iva' => $newTotalIva,
            'old_total' => $oldTotal,
            'new_total' => $newTotal,
            'difference' => $newTotal - $oldTotal,
            'paid_amount' => $paidAmount,
            'old_pending' => $oldTotal - $paidAmount,
            'new_pending' => $newTotal - $paidAmount,
        ];
    }

    /**
     * Aplicar actualización de precio a una venta individual
     * 
     * @param int $saleId ID de la venta
     * @return array Resultado de la actualización
     * @throws Exception Si ocurre un error durante la actualización
     */
    public function updateSalePrice(int $saleId): array
    {
        return DB::transaction(function () use ($saleId) {
            $sale = SaleHeader::with(['items.product', 'customer', 'currentAccountMovements'])->lockForUpdate()->findOrFail($saleId);

            // Validar que la venta se puede actualizar
            $this->validateSaleCanBeUpdated($sale);

            // Guardar valores originales para auditoría
            $oldTotal = (float) $sale->total;
            $oldSubtotal = (float) $sale->subtotal;
            $oldTotalIva = (float) $sale->total_iva_amount;

            $newSubtotal = 0;
            $newTotalIva = 0;

            // Actualizar cada ítem
            foreach ($sale->items as $item) {
                $product = $item->product;

                if (!$product) {
                    throw new Exception("Producto no encontrado para el ítem de venta #{$item->id}");
                }

                $newPrice = (float) $product->sale_price;
                $quantity = (float) $item->quantity;

                // Calcular nuevos valores
                $newItemSubtotal = $newPrice * $quantity;
                $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);

                // Aplicar descuento si existe
                $discountAmount = 0;
                if ($item->discount_type && $item->discount_value > 0) {
                    if ($item->discount_type === 'percentage') {
                        $discountAmount = $newItemSubtotal * ((float) $item->discount_value / 100);
                    } else {
                        $discountAmount = (float) $item->discount_value;
                    }
                    $item->discount_amount = $discountAmount;
                    $newItemSubtotal -= $discountAmount;
                    $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);
                }

                $newItemTotal = $newItemSubtotal + $newItemIva;

                // Actualizar ítem
                $item->unit_price = $newPrice;
                $item->item_subtotal = $newItemSubtotal;
                $item->item_iva = $newItemIva;
                $item->item_total = $newItemTotal;
                $item->save();

                $newSubtotal += $newItemSubtotal;
                $newTotalIva += $newItemIva;
            }

            // Aplicar descuento global de la venta si existe
            if ($sale->discount_type && $sale->discount_value > 0) {
                $globalDiscount = 0;
                if ($sale->discount_type === 'percentage') {
                    $globalDiscount = $newSubtotal * ((float) $sale->discount_value / 100);
                } else {
                    $globalDiscount = (float) $sale->discount_value;
                }
                $sale->discount_amount = $globalDiscount;
                $newSubtotal -= $globalDiscount;
                // Recalcular IVA proporcional después del descuento
                $newTotalIva = $newSubtotal * ($newTotalIva / ($newSubtotal + $globalDiscount));
            }

            $newTotal = $newSubtotal + $newTotalIva + (float) $sale->iibb + (float) $sale->internal_tax;

            // Actualizar venta
            $sale->subtotal = $newSubtotal;
            $sale->total_iva_amount = $newTotalIva;
            $sale->total = $newTotal;
            $sale->save();

            // Actualizar movimiento de cuenta corriente si existe
            $this->updateCurrentAccountMovement($sale, $oldTotal, $newTotal);

            // Log de actividad
            Log::info("Precio de venta actualizado", [
                'sale_id' => $sale->id,
                'receipt_number' => $sale->receipt_number,
                'old_total' => $oldTotal,
                'new_total' => $newTotal,
                'difference' => $newTotal - $oldTotal,
            ]);

            $paidAmount = (float) $sale->paid_amount;

            return [
                'success' => true,
                'sale_id' => $sale->id,
                'receipt_number' => $sale->receipt_number,
                'old_total' => $oldTotal,
                'new_total' => $newTotal,
                'difference' => $newTotal - $oldTotal,
                'paid_amount' => $paidAmount,
                'old_pending' => $oldTotal - $paidAmount,
                'new_pending' => $newTotal - $paidAmount,
                'message' => 'Precio actualizado correctamente',
            ];
        });
    }

    /**
     * Vista previa de actualización masiva de precios
     * 
     * @param int|null $customerId ID del cliente (null = todos)
     * @return array Resumen de cambios por cliente
     */
    public function previewBatchPriceUpdate(?int $customerId = null): array
    {
        $query = SaleHeader::with(['items.product', 'customer.person'])
            ->whereIn('payment_status', ['pending', 'partial'])
            ->whereNotIn('status', ['rejected', 'annulled']);

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $sales = $query->get();

        $customerGroups = [];
        $grandTotalDifference = 0;
        $totalSalesWithChanges = 0;

        foreach ($sales as $sale) {
            try {
                $preview = $this->previewSalePriceUpdate($sale->id);

                // Solo incluir ventas con cambios de precio
                if (abs($preview['difference']) < 0.01) {
                    continue;
                }

                $totalSalesWithChanges++;
                $grandTotalDifference += $preview['difference'];

                $customerKey = $sale->customer_id ?? 0;
                $customerName = $sale->customer
                    ? $sale->customer->person->first_name . ' ' . $sale->customer->person->last_name
                    : 'Cliente General';

                if (!isset($customerGroups[$customerKey])) {
                    $customerGroups[$customerKey] = [
                        'customer_id' => $sale->customer_id,
                        'customer_name' => $customerName,
                        'sales' => [],
                        'total_difference' => 0,
                    ];
                }

                $customerGroups[$customerKey]['sales'][] = [
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'date' => $sale->date->format('Y-m-d'),
                    'old_total' => $preview['old_total'],
                    'new_total' => $preview['new_total'],
                    'difference' => $preview['difference'],
                    'paid_amount' => $preview['paid_amount'],
                    'old_pending' => $preview['old_pending'],
                    'new_pending' => $preview['new_pending'],
                    'items_count' => count($preview['items']),
                ];

                $customerGroups[$customerKey]['total_difference'] += $preview['difference'];

            } catch (Exception $e) {
                Log::warning("Error al generar preview para venta #{$sale->id}: " . $e->getMessage());
                continue;
            }
        }

        return [
            'customers' => array_values($customerGroups),
            'total_sales_with_changes' => $totalSalesWithChanges,
            'grand_total_difference' => $grandTotalDifference,
            'customers_affected' => count($customerGroups),
        ];
    }

    /**
     * Aplicar actualización masiva de precios
     * 
     * @param array $saleIds Array de IDs de ventas a actualizar
     * @return array Resumen de actualizaciones
     */
    public function updateBatchPrices(array $saleIds): array
    {
        $results = [
            'updated' => 0,
            'failed' => 0,
            'total_difference' => 0,
            'details' => [],
            'errors' => [],
        ];

        DB::beginTransaction();
        try {
            foreach ($saleIds as $saleId) {
                try {
                    $result = $this->updateSalePrice($saleId);
                    $results['updated']++;
                    $results['total_difference'] += $result['difference'];
                    $results['details'][] = $result;
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'sale_id' => $saleId,
                        'error' => $e->getMessage(),
                    ];
                    Log::error("Error al actualizar venta #{$saleId}: " . $e->getMessage());
                }
            }

            // Si hubo algún error, hacer rollback de todo
            if ($results['failed'] > 0) {
                DB::rollBack();
                throw new Exception("Se encontraron errores durante la actualización masiva. No se aplicó ningún cambio.");
            }

            DB::commit();

            return array_merge($results, [
                'success' => true,
                'message' => "{$results['updated']} ventas actualizadas correctamente",
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Validar que una venta se puede actualizar
     * 
     * @param SaleHeader $sale
     * @throws Exception Si la venta no se puede actualizar
     */
    private function validateSaleCanBeUpdated(SaleHeader $sale): void
    {
        // Solo ventas pendientes o parciales
        if (!in_array($sale->payment_status, ['pending', 'partial'])) {
            throw new Exception("Solo se pueden actualizar ventas pendientes o parcialmente pagadas");
        }

        // No actualizar ventas rechazadas o anuladas
        if (in_array($sale->status, ['rejected', 'annulled'])) {
            throw new Exception("No se pueden actualizar ventas rechazadas o anuladas");
        }

        // Verificar que tiene ítems
        if ($sale->items->isEmpty()) {
            throw new Exception("La venta no tiene ítems");
        }
    }

    /**
     * Actualizar el movimiento de cuenta corriente asociado a la venta
     * 
     * @param SaleHeader $sale
     * @param float $oldTotal
     * @param float $newTotal
     */
    private function updateCurrentAccountMovement(SaleHeader $sale, float $oldTotal, float $newTotal): void
    {
        if (!$sale->customer_id) {
            return; // No hay cuenta corriente si no hay cliente
        }

        // Buscar movimiento de débito de la venta
        $movement = CurrentAccountMovement::where('sale_id', $sale->id)
            ->where('type', 'debit')
            ->first();

        if ($movement) {
            $difference = $newTotal - $oldTotal;
            $movement->amount = $newTotal;
            $movement->balance_after += $difference;
            $movement->save();

            // Actualizar balance de la cuenta corriente
            $account = $movement->currentAccount;
            if ($account) {
                $account->current_balance += $difference;
                $account->save();
            }

            Log::info("Movimiento de cuenta corriente actualizado", [
                'movement_id' => $movement->id,
                'old_amount' => $oldTotal,
                'new_amount' => $newTotal,
                'difference' => $difference,
            ]);
        }
    }
}
