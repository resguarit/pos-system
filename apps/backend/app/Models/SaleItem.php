<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class SaleItem extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'sale_header_id',
        'product_id',
        'combo_id',
        'is_combo',
        'quantity',
        'unit_price',
        'discount_type',
        'discount_value',
        'discount_amount',
        'iva_rate',
        'item_subtotal',
        'item_iva',
        'item_total',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('sale_item')
            ->logOnlyDirty();
    }

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:3',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:3',
        'iva_rate' => 'decimal:2',
        'item_subtotal' => 'decimal:3',
        'item_iva' => 'decimal:3',
        'item_total' => 'decimal:3',
        'is_combo' => 'boolean',
    ];

    public function saleHeader()
    {
        return $this->belongsTo(SaleHeader::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function iva()
    {
        return $this->belongsTo(Iva::class);
    }

    /**
     * Relación con el combo (si es un item de combo)
     */
    public function combo()
    {
        return $this->belongsTo(Combo::class);
    }

    /**
     * Verificar si este item es un combo
     */
    public function isCombo(): bool
    {
        return $this->is_combo && $this->combo_id !== null;
    }

    /**
     * Obtener el nombre del producto o combo
     */
    public function getItemName(): string
    {
        if ($this->isCombo()) {
            return $this->combo->name;
        }

        return $this->product->description ?? 'Producto eliminado';
    }
}