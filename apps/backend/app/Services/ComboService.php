<?php

declare(strict_types=1);

namespace App\Services;

use App\Interfaces\ComboServiceInterface;
use App\Models\Combo;
use App\Models\Product;
use App\Models\ComboItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ComboService implements ComboServiceInterface
{
    /**
     * Obtener todos los combos con filtros opcionales
     */
    public function getAll(array $filters = []): Collection
    {
        $query = Combo::with(['comboItems.product']);

        if (isset($filters['active_only']) && $filters['active_only']) {
            $query->active();
        }

        if (isset($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            return $query->get()->filter(function ($combo) use ($branchId) {
                return $combo->isAvailableInBranch($branchId);
            });
        }

        return $query->get();
    }

    /**
     * Obtener combos disponibles en una sucursal específica
     */
    public function getAvailableInBranch(int $branchId): Collection
    {
        return Combo::active()
            ->with(['comboItems.product.stocks' => function ($query) use ($branchId) {
                $query->where('branch_id', $branchId);
            }])
            ->get()
            ->filter(function ($combo) use ($branchId) {
                return $combo->isAvailableInBranch($branchId);
            });
    }

    /**
     * Obtener un combo por ID con sus relaciones
     */
    public function getById(int $id): ?Combo
    {
        return Combo::with(['comboItems.product', 'comboItems.product.stocks'])->find($id);
    }

    /**
     * Crear un nuevo combo
     */
    public function create(array $data): Combo
    {
        return DB::transaction(function () use ($data) {
            // Crear el combo
            $combo = Combo::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'discount_type' => $data['discount_type'],
                'discount_value' => $data['discount_value'],
                'is_active' => $data['is_active'] ?? true,
                'notes' => $data['notes'] ?? null,
            ]);

            // Agregar productos al combo
            if (isset($data['items']) && is_array($data['items'])) {
                $this->addItemsToCombo($combo, $data['items']);
            }

            return $combo->load('comboItems.product');
        });
    }

    /**
     * Actualizar un combo existente
     */
    public function update(int $id, array $data): Combo
    {
        $combo = $this->getById($id);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$id} no encontrado");
        }

        return DB::transaction(function () use ($combo, $data) {
            // Actualizar datos básicos del combo
            $combo->update([
                'name' => $data['name'] ?? $combo->name,
                'description' => $data['description'] ?? $combo->description,
                'discount_type' => $data['discount_type'] ?? $combo->discount_type,
                'discount_value' => $data['discount_value'] ?? $combo->discount_value,
                'is_active' => $data['is_active'] ?? $combo->is_active,
                'notes' => $data['notes'] ?? $combo->notes,
            ]);

            // Actualizar items si se proporcionan
            if (isset($data['items']) && is_array($data['items'])) {
                $this->updateComboItems($combo, $data['items']);
            }

            return $combo->load('comboItems.product');
        });
    }

    /**
     * Agregar items a un combo
     */
    public function addItemsToCombo(Combo $combo, array $items): void
    {
        foreach ($items as $item) {
            ComboItem::create([
                'combo_id' => $combo->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }
    }

    /**
     * Actualizar items de un combo
     */
    public function updateComboItems(Combo $combo, array $items): void
    {
        // Eliminar items existentes
        $combo->comboItems()->delete();

        // Crear nuevos items
        $this->addItemsToCombo($combo, $items);
    }

    /**
     * Calcular precio dinámico del combo
     */
    public function calculateComboPrice(Combo $combo): array
    {
        $basePrice = 0;
        $itemsBreakdown = [];

        foreach ($combo->comboItems as $comboItem) {
            $productPrice = $comboItem->product->sale_price ?? $comboItem->product->calculateSalePriceFromMarkup();
            $itemTotal = $productPrice * $comboItem->quantity;
            
            $basePrice += $itemTotal;
            
            $itemsBreakdown[] = [
                'product' => $comboItem->product,
                'quantity' => $comboItem->quantity,
                'unit_price' => $productPrice,
                'total_price' => $itemTotal,
            ];
        }

        $discountAmount = $this->calculateDiscountAmount(
            $basePrice, 
            $combo->discount_type, 
            $this->ensureFloatValue($combo->discount_value)
        );
        $finalPrice = max(0, $basePrice - $discountAmount);

        return [
            'base_price' => $basePrice,
            'discount_amount' => $discountAmount,
            'final_price' => $finalPrice,
            'items_breakdown' => $itemsBreakdown,
            'combo' => $combo,
        ];
    }

    /**
     * Asegurar que un valor sea de tipo float
     * Convierte strings numéricos a float de manera segura
     * 
     * @param mixed $value El valor a convertir
     * @return float El valor convertido a float
     * @throws \InvalidArgumentException Si el valor no es numérico
     */
    private function ensureFloatValue($value): float
    {
        if (is_float($value)) {
            return $value;
        }
        
        if (is_int($value)) {
            return (float) $value;
        }
        
        if (is_string($value) && is_numeric($value)) {
            return (float) $value;
        }
        
        throw new \InvalidArgumentException(
            "Expected numeric value for discount calculation, got: " . gettype($value)
        );
    }

    /**
     * Calcular monto de descuento
     * 
     * @param float $basePrice Precio base del combo
     * @param string $discountType Tipo de descuento ('percentage' o 'fixed_amount')
     * @param float $discountValue Valor del descuento
     * @return float Monto del descuento calculado
     */
    private function calculateDiscountAmount(float $basePrice, string $discountType, float $discountValue): float
    {
        // Validar parámetros de entrada
        if ($basePrice < 0) {
            throw new \InvalidArgumentException("Base price cannot be negative");
        }
        
        if ($discountValue < 0) {
            throw new \InvalidArgumentException("Discount value cannot be negative");
        }
        
        // Calcular descuento según el tipo
        switch ($discountType) {
            case 'percentage':
                // Validar que el porcentaje no exceda 100%
                if ($discountValue > 100) {
                    throw new \InvalidArgumentException("Percentage discount cannot exceed 100%");
                }
                return $basePrice * ($discountValue / 100);
                
            case 'fixed_amount':
                // El descuento fijo no puede exceder el precio base
                return min($discountValue, $basePrice);
                
            default:
                throw new \InvalidArgumentException("Invalid discount type: {$discountType}");
        }
    }

    /**
     * Verificar disponibilidad de combo en sucursal
     */
    public function checkComboAvailability(Combo $combo, int $branchId, int $requestedQuantity = 1): array
    {
        $availability = [
            'is_available' => true,
            'max_quantity' => 0,
            'limiting_products' => [],
        ];

        $maxQuantity = PHP_INT_MAX;

        foreach ($combo->comboItems as $comboItem) {
            $stock = $comboItem->product->stocks()
                ->where('branch_id', $branchId)
                ->first();

            if (!$stock) {
                $availability['is_available'] = false;
                $availability['limiting_products'][] = [
                    'product' => $comboItem->product,
                    'reason' => 'No hay stock configurado en esta sucursal',
                    'available' => 0,
                    'required' => $comboItem->quantity,
                ];
                continue;
            }

            $availableForThisProduct = floor($stock->current_stock / $comboItem->quantity);
            
            // Solo marcar como no disponible si no hay stock configurado
            // Permitir stock 0 o negativo para no perder ventas
            if ($availableForThisProduct < $requestedQuantity) {
                // Solo agregar a limiting_products para información, pero no bloquear la venta
                $availability['limiting_products'][] = [
                    'product' => $comboItem->product,
                    'reason' => $stock->current_stock < 0 ? 'Stock negativo' : 'Stock bajo',
                    'available' => $stock->current_stock,
                    'required' => $comboItem->quantity * $requestedQuantity,
                    'max_combo_quantity' => $availableForThisProduct,
                ];
            }

            $maxQuantity = min($maxQuantity, $availableForThisProduct);
        }

        $availability['max_quantity'] = $maxQuantity;

        return $availability;
    }

    /**
     * Descontar stock de productos componentes al vender un combo (método privado)
     */
    private function deductComboStockFromCombo(Combo $combo, int $branchId, int $quantity): void
    {
        DB::transaction(function () use ($combo, $branchId, $quantity) {
            foreach ($combo->comboItems as $comboItem) {
                $stock = $comboItem->product->stocks()
                    ->where('branch_id', $branchId)
                    ->first();

                if ($stock) {
                    $deductAmount = $comboItem->quantity * $quantity;
                    
                    if ($stock->current_stock >= $deductAmount) {
                        $stock->decrement('current_stock', $deductAmount);
                        
                        Log::info("Stock deducted for combo sale", [
                            'combo_id' => $combo->id,
                            'combo_name' => $combo->name,
                            'product_id' => $comboItem->product_id,
                            'product_name' => $comboItem->product->description,
                            'branch_id' => $branchId,
                            'quantity_deducted' => $deductAmount,
                            'remaining_stock' => $stock->current_stock - $deductAmount,
                        ]);
                    } else {
                        throw new \Exception("Stock insuficiente para el producto {$comboItem->product->description}");
                    }
                } else {
                    throw new \Exception("No hay stock configurado para el producto {$comboItem->product->description} en esta sucursal");
                }
            }
        });
    }

    /**
     * Restaurar stock de productos componentes al anular una venta con combo (método privado)
     */
    private function restoreComboStockFromCombo(Combo $combo, int $branchId, int $quantity): void
    {
        DB::transaction(function () use ($combo, $branchId, $quantity) {
            foreach ($combo->comboItems as $comboItem) {
                $stock = $comboItem->product->stocks()
                    ->where('branch_id', $branchId)
                    ->first();

                if ($stock) {
                    $restoreAmount = $comboItem->quantity * $quantity;
                    $stock->increment('current_stock', $restoreAmount);
                    
                    Log::info("Stock restored for combo annulment", [
                        'combo_id' => $combo->id,
                        'combo_name' => $combo->name,
                        'product_id' => $comboItem->product_id,
                        'product_name' => $comboItem->product->description,
                        'branch_id' => $branchId,
                        'quantity_restored' => $restoreAmount,
                        'new_stock' => $stock->current_stock + $restoreAmount,
                    ]);
                }
            }
        });
    }

    /**
     * Eliminar un combo (soft delete)
     */
    public function delete(int $id): bool
    {
        $combo = $this->getById($id);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$id} no encontrado");
        }

        return $combo->delete();
    }

    /**
     * Calcular precio dinámico de un combo
     */
    public function calculatePrice(int $comboId): array
    {
        $combo = $this->getById($comboId);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$comboId} no encontrado");
        }

        return $this->calculateComboPrice($combo);
    }

    /**
     * Verificar disponibilidad de combo en sucursal
     */
    public function checkAvailability(int $comboId, int $branchId, int $quantity = 1): array
    {
        $combo = $this->getById($comboId);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$comboId} no encontrado");
        }

        return $this->checkComboAvailability($combo, $branchId, $quantity);
    }

    /**
     * Descontar stock de productos componentes al vender un combo
     */
    public function deductComboStock(int $comboId, int $branchId, int $quantity): void
    {
        $combo = $this->getById($comboId);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$comboId} no encontrado");
        }

        $this->deductComboStockFromCombo($combo, $branchId, $quantity);
    }

    /**
     * Restaurar stock de productos componentes al anular una venta con combo
     */
    public function restoreComboStock(int $comboId, int $branchId, int $quantity): void
    {
        $combo = $this->getById($comboId);
        
        if (!$combo) {
            throw new \Exception("Combo con ID {$comboId} no encontrado");
        }

        $this->restoreComboStockFromCombo($combo, $branchId, $quantity);
    }

    /**
     * Validar datos de combo antes de crear/actualizar
     */
    public function validateComboData(array $data): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors[] = 'El nombre del combo es requerido';
        }

        if (!isset($data['discount_type']) || !in_array($data['discount_type'], ['percentage', 'fixed_amount'])) {
            $errors[] = 'El tipo de descuento debe ser "percentage" o "fixed_amount"';
        }

        if (!isset($data['discount_value']) || $data['discount_value'] < 0) {
            $errors[] = 'El valor de descuento no puede ser negativo';
        }

        if (isset($data['discount_type']) && $data['discount_type'] === 'percentage' && $data['discount_value'] > 100) {
            $errors[] = 'El descuento porcentual no puede ser mayor al 100%';
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            $errors[] = 'El combo debe tener al menos un producto';
        }

        if (isset($data['items'])) {
            foreach ($data['items'] as $index => $item) {
                if (empty($item['product_id'])) {
                    $errors[] = "El producto en la posición {$index} es requerido";
                }

                if (!isset($item['quantity']) || $item['quantity'] <= 0) {
                    $errors[] = "La cantidad en la posición {$index} debe ser mayor a 0";
                }

                // Verificar que el producto existe
                if (isset($item['product_id']) && !Product::find($item['product_id'])) {
                    $errors[] = "El producto con ID {$item['product_id']} no existe";
                }
            }
        }

        return $errors;
    }

    /**
     * Obtener estadísticas de combos
     */
    public function getStatistics(): array
    {
        $totalCombos = Combo::count();
        $activeCombos = Combo::active()->count();
        $inactiveCombos = $totalCombos - $activeCombos;

        return [
            'total_combos' => $totalCombos,
            'active_combos' => $activeCombos,
            'inactive_combos' => $inactiveCombos,
        ];
    }
}
