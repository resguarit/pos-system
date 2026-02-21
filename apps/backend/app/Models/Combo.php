<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Combo extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'name',
        'description',
        'discount_type',
        'discount_value',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'is_active' => 'boolean',
    ];

    /**
     * Relación con los productos que componen el combo
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'combo_items')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    /**
     * Relación con los items de combo (tabla pivot con datos adicionales)
     */
    public function comboItems(): HasMany
    {
        return $this->hasMany(ComboItem::class);
    }

    /**
     * Relación con grupos de opciones del combo
     */
    public function groups(): HasMany
    {
        return $this->hasMany(ComboGroup::class);
    }

    /**
     * Relación con las ventas que incluyen este combo
     */
    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * Scope para combos activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Verificar si el combo está disponible en una sucursal específica
     */
    public function isAvailableInBranch(int $branchId): bool
    {
        foreach ($this->comboItems as $comboItem) {
            $stock = $comboItem->product->stocks()
                ->where('branch_id', $branchId)
                ->first();

            if (!$stock || $stock->current_stock < $comboItem->quantity) {
                return false;
            }
        }

        return true;
    }

    /**
     * Obtener la cantidad máxima disponible del combo en una sucursal
     */
    public function getMaxAvailableQuantityInBranch(int $branchId): int
    {
        $maxQuantity = PHP_INT_MAX;

        foreach ($this->comboItems as $comboItem) {
            $stock = $comboItem->product->stocks()
                ->where('branch_id', $branchId)
                ->first();

            if (!$stock) {
                return 0;
            }

            $availableForThisProduct = floor($stock->current_stock / $comboItem->quantity);
            $maxQuantity = min($maxQuantity, $availableForThisProduct);
        }

        return $maxQuantity;
    }

    /**
     * Calcular el precio total del combo sin descuento
     */
    public function calculateBasePrice(): float
    {
        $totalPrice = 0;

        foreach ($this->comboItems as $comboItem) {
            $productPrice = $comboItem->product->sale_price ?? $comboItem->product->calculateSalePriceFromMarkup();
            $totalPrice += $productPrice * $comboItem->quantity;
        }

        return $totalPrice;
    }

    /**
     * Calcular el precio final del combo con descuento aplicado
     */
    public function calculateFinalPrice(): float
    {
        $basePrice = $this->calculateBasePrice();

        if ($this->discount_type === 'percentage') {
            $discountAmount = $basePrice * ($this->discount_value / 100);
        } else {
            $discountAmount = $this->discount_value;
        }

        return max(0, $basePrice - $discountAmount);
    }

    /**
     * Obtener el monto del descuento aplicado
     */
    public function getDiscountAmount(): float
    {
        $basePrice = $this->calculateBasePrice();

        if ($this->discount_type === 'percentage') {
            return $basePrice * ($this->discount_value / 100);
        }

        return min($this->discount_value, $basePrice);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'discount_type', 'discount_value', 'is_active', 'notes'])
            ->useLogName('combo')
            ->logOnlyDirty();
    }
}

