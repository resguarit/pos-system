<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'supplier_id',
        'branch_id',
        'payment_method_id',
        'currency',
        'order_date',
        'total_amount',
        'status',
        'notes',
        'affects_cash_register',
    ];

    protected $casts = [
        'order_date' => 'date',
        'total_amount' => 'decimal:2',
        'currency' => 'string',
        'affects_cash_register' => 'boolean',
    ];

    /**
     * The attributes that are mass assignable pero con validaciones especiales.
     */
    public function update(array $attributes = [], array $options = [])
    {
        // Prevenir cambio de moneda en órdenes existentes
        if (isset($attributes['currency']) && $this->exists && $this->currency !== $attributes['currency']) {
            throw new \Exception(
                "No se puede cambiar la moneda de una orden existente. " .
                "La orden actual es {$this->currency}, se intentó cambiar a {$attributes['currency']}"
            );
        }

        return parent::update($attributes, $options);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['supplier_id', 'branch_id', 'currency', 'order_date', 'total_amount', 'status', 'notes'])
            ->useLogName('purchase_order')
            ->logOnlyDirty();
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    public function payments()
    {
        return $this->hasMany(PurchaseOrderPayment::class);
    }

    public function calculateTotal()
    {
        // Recalcular total basándose en los items actuales
        return $this->items->sum(function ($item) {
            return $item->quantity * $item->purchase_price;
        });
    }

    /**
     * Recalcula y guarda el total de la orden
     */
    public function recalculateAndSaveTotal()
    {
        $this->total_amount = $this->calculateTotal();
        $this->save();
        return $this->total_amount;
    }

    /**
     * Scope para filtrar por moneda
     */
    public function scopeByCurrency($query, $currency)
    {
        return $query->where('currency', $currency);
    }

    /**
     * Validar que todos los productos sean de la misma moneda que la orden
     */
    public function validateProductsCurrency(array $productIds)
    {
        $orderCurrency = $this->currency;

        foreach ($productIds as $productId) {
            $product = Product::find($productId);
            if (!$product) {
                throw new \Exception("Producto con ID {$productId} no encontrado");
            }

            $productCurrency = $product->currency ?? 'ARS';
            if ($productCurrency !== $orderCurrency) {
                throw new \Exception(
                    "El producto '{$product->description}' es de moneda {$productCurrency} " .
                    "pero la orden es {$orderCurrency}. Todos los productos deben ser de la misma moneda."
                );
            }
        }
    }

    /**
     * Validar que un array de items tenga productos de la moneda especificada
     */
    public static function validateItemsCurrency(array $items, string $currency)
    {
        foreach ($items as $item) {
            $product = Product::find($item['product_id']);
            if (!$product) {
                throw new \Exception("Producto con ID {$item['product_id']} no encontrado");
            }

            $productCurrency = $product->currency ?? 'ARS';
            if ($productCurrency !== $currency) {
                throw new \Exception(
                    "El producto '{$product->description}' es de moneda {$productCurrency} " .
                    "pero la orden es {$currency}. Todos los productos deben ser de la misma moneda."
                );
            }
        }
    }
}