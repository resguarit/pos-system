<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SaleHeader;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class UpdateSalePricesService
{
    /**
     * Alias for getSaleUpdatePreview (API compatibility)
     */
    public function previewSalePriceUpdate(int $saleId): array
    {
        return $this->getSaleUpdatePreview($saleId);
    }

    /**
     * Preview batch price update for multiple sales
     */
    public function previewBatchPriceUpdate(array $saleIds): array
    {
        $previews = [];
        $totalDifference = 0;

        foreach ($saleIds as $saleId) {
            try {
                $preview = $this->getSaleUpdatePreview((int) $saleId);
                $previews[] = $preview;
                $totalDifference += $preview['difference'];
            } catch (\Exception $e) {
                $previews[] = [
                    'sale_id' => $saleId,
                    'error' => $e->getMessage()
                ];
            }
        }

        return [
            'sales' => $previews,
            'total_difference' => $totalDifference,
            'count' => count($previews)
        ];
    }

    /**
     * Obtener vista previa de actualización de precios para una venta
     * 
     * @param int $saleId ID de la venta
     * @return array Resumen de cambios
     */
    public function getSaleUpdatePreview(int $saleId): array
    {
        $sale = SaleHeader::with(['items.product', 'customer.person', 'currentAccountMovements'])->findOrFail($saleId);

        $originalTotal = (float) $sale->total;
        $newSubtotal = 0;
        $newTotalIva = 0;
        $paidAmount = (float) $sale->paid_amount;
        $items = [];

        foreach ($sale->items as $item) {
            $product = $item->product;
            if (!$product)
                continue;

            $oldPrice = (float) $item->unit_price;
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
                $newItemSubtotal -= $discountAmount;
                $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);
            }

            $newSubtotal += $newItemSubtotal;
            $newTotalIva += $newItemIva;

            // Add item details for frontend
            $priceChange = $newPrice - $oldPrice;
            $priceChangePercentage = $oldPrice > 0 ? ($priceChange / $oldPrice) * 100 : 0;

            $items[] = [
                'id' => $item->id,
                'product_name' => $product->name ?? 'Producto sin nombre',
                'quantity' => $quantity,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'price_change' => $priceChange,
                'price_change_percentage' => $priceChangePercentage,
            ];
        }

        // Aplicar descuento global de la venta si existe
        if ($sale->discount_type && $sale->discount_value > 0) {
            $globalDiscount = 0;
            if ($sale->discount_type === 'percentage') {
                $globalDiscount = $newSubtotal * ((float) $sale->discount_value / 100);
            } else {
                $globalDiscount = (float) $sale->discount_value;
            }
            $newSubtotal -= $globalDiscount;
            // Recalcular IVA proporcional después del descuento
            if (($newSubtotal + $globalDiscount) > 0) {
                $newTotalIva = $newSubtotal * ($newTotalIva / ($newSubtotal + $globalDiscount));
            }
        }

        $newTotal = $newSubtotal + $newTotalIva + (float) $sale->iibb + (float) $sale->internal_tax;

        // Calcular el total efectivo actual (original + recargos previos)
        $movementType = MovementType::where('name', 'Recargo')->first();
        $totalPreviousSurcharges = 0;

        if ($movementType) {
            $totalPreviousSurcharges = (float) $sale->currentAccountMovements
                ->where('movement_type_id', $movementType->id)
                ->sum('amount');
        }

        $currentEffectiveTotal = $originalTotal + $totalPreviousSurcharges;

        // Get customer name
        $customerName = '';
        if ($sale->customer && $sale->customer->person) {
            $customerName = ($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? '');
        }

        return [
            'sale_id' => $sale->id,
            'receipt_number' => $sale->receipt_number,
            'customer_name' => $customerName,
            'items' => $items,
            'original_total' => $originalTotal,
            'previous_surcharges' => $totalPreviousSurcharges,
            'old_total' => $currentEffectiveTotal,
            'new_total' => $newTotal,
            'difference' => $newTotal - $currentEffectiveTotal,
            'paid_amount' => $paidAmount,
            'old_pending' => $currentEffectiveTotal - $paidAmount,
            'new_pending' => $newTotal - $paidAmount,
        ];
    }

    /**
     * Aplicar actualización de precio a una venta individual mediante recargo
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

            // Calcular valores nuevos sin modificar la venta
            $originalTotal = (float) $sale->total;
            $newSubtotal = 0;
            $newTotalIva = 0;

            // Calcular nuevo total basado en precios actuales
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
                    $newItemSubtotal -= $discountAmount;
                    $newItemIva = $newItemSubtotal * ((float) $item->iva_rate / 100);
                }

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
                $newSubtotal -= $globalDiscount;
                // Recalcular IVA proporcional después del descuento
                $newTotalIva = $newSubtotal * ($newTotalIva / ($newSubtotal + $globalDiscount));
            }

            $newTotal = $newSubtotal + $newTotalIva + (float) $sale->iibb + (float) $sale->internal_tax;

            // Calcular el total efectivo actual (original + recargos previos)
            $movementType = MovementType::where('name', 'Recargo')->first();
            $totalPreviousSurcharges = 0;

            if ($movementType) {
                $totalPreviousSurcharges = (float) $sale->currentAccountMovements
                    ->where('movement_type_id', $movementType->id)
                    ->sum('amount');
            }

            $currentEffectiveTotal = $originalTotal + $totalPreviousSurcharges;
            $difference = $newTotal - $currentEffectiveTotal;

            // Solo aplicar recargo si hay una diferencia real con el total efectivo actual
            if ($difference > 0.01) {
                $this->createSurchargeMovement($sale, $difference);

                // Log de actividad
                Log::info("Recargo aplicado por actualización de precios", [
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'original_total' => $originalTotal,
                    'previous_surcharges' => $totalPreviousSurcharges,
                    'current_effective_total' => $currentEffectiveTotal,
                    'new_total' => $newTotal,
                    'surcharge_amount' => $difference,
                ]);

                return [
                    'success' => true,
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'old_total' => $currentEffectiveTotal,
                    'new_total' => $newTotal,
                    'difference' => $difference,
                    'message' => 'Recargo aplicado correctamente'
                ];
            }

            return [
                'success' => false,
                'message' => 'No hay diferencia de precio para aplicar',
                'old_total' => $currentEffectiveTotal,
                'new_total' => $newTotal,
                'difference' => 0
            ];
        });
    }

    /**
     * Actualizar precios de múltiples ventas
     */
    public function batchUpdateSalePrices(array $saleIds): array
    {
        $results = [
            'total' => count($saleIds),
            'updated' => 0,
            'errors' => 0,
            'details' => []
        ];

        foreach ($saleIds as $id) {
            try {
                $result = $this->updateSalePrice((int) $id);
                if ($result['success']) {
                    $results['updated']++;
                }
                $results['details'][] = $result;
            } catch (Exception $e) {
                $results['errors']++;
                $results['details'][] = [
                    'success' => false,
                    'sale_id' => $id,
                    'message' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    /**
     * Validar si una venta puede ser actualizada
     */
    private function validateSaleCanBeUpdated(SaleHeader $sale): void
    {
        // 1. Debe estar vinculada a una cuenta corriente (ya sea por payment_method o por cliente con cuenta)
        $hasCurrentAccount = false;

        if ($sale->payment_method === 'current_account') {
            $hasCurrentAccount = true;
        } elseif ($sale->customer_id) {
            // Si tiene cliente, verificar si tiene cuenta corriente activa
            $currentAccount = CurrentAccount::where('customer_id', $sale->customer_id)->first();
            if ($currentAccount) {
                $hasCurrentAccount = true;
            }
        }

        if (!$hasCurrentAccount) {
            throw new Exception("La venta #{$sale->receipt_number} no está vinculada a una cuenta corriente");
        }

        // 2. Debe estar pendiente o parcial
        if ($sale->payment_status === 'paid') {
            throw new Exception("La venta #{$sale->receipt_number} ya está pagada por completo");
        }

        // 3. No debe estar anulada
        if ($sale->status === 'canceled') {
            throw new Exception("La venta #{$sale->receipt_number} está anulada");
        }

        // 4. Debe tener un cliente asignado
        if (!$sale->customer_id) {
            throw new Exception("La venta #{$sale->receipt_number} no tiene un cliente asignado");
        }
    }

    /**
     * Crear movimiento de recargo en la cuenta corriente
     */
    private function createSurchargeMovement(SaleHeader $sale, float $amount): void
    {
        $movementType = MovementType::where('name', 'Recargo')->first();
        if (!$movementType) {
            throw new Exception("Tipo de movimiento 'Recargo' no encontrado. Por favor ejecute las migraciones.");
        }

        $currentAccount = CurrentAccount::where('customer_id', $sale->customer_id)->first();
        if (!$currentAccount) {
            throw new Exception("Cuenta corriente no encontrada para el cliente");
        }

        $currentBalance = (float) $currentAccount->current_balance;
        $newBalance = $currentBalance + $amount;

        $movement = new CurrentAccountMovement();
        $movement->current_account_id = $currentAccount->id;
        $movement->sale_id = $sale->id;
        $movement->movement_type_id = $movementType->id;
        $movement->amount = (string) $amount;
        $movement->balance_before = (string) $currentBalance;
        $movement->balance_after = (string) $newBalance;
        $movement->description = "Recargo por actualización de precios - Venta #{$sale->receipt_number}";
        $movement->movement_date = now();
        $movement->user_id = auth()->id() ?? 1;
        $movement->save();

        $currentAccount->current_balance = (string) $newBalance;
        $currentAccount->save();
    }
}
