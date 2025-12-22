<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ComboItem extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'combo_id',
        'product_id',
        'quantity',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('combo_item')
            ->logOnlyDirty();
    }

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

