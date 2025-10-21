<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'combo_id',
        'product_id',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    /**
     * Relación con el combo
     */
    public function combo(): BelongsTo
    {
        return $this->belongsTo(Combo::class);
    }

    /**
     * Relación con el producto
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /**
     * Calcular el precio total de este item del combo
     */
    public function calculateItemPrice(): float
    {
        $productPrice = $this->product->sale_price ?? $this->product->calculateSalePriceFromMarkup();
        return $productPrice * $this->quantity;
    }
}

