<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Opcional: si usas SoftDeletes
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class PaymentMethod extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;
    // use SoftDeletes; // Opcional: si usas SoftDeletes

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'affects_cash',
        'is_customer_credit',
        'discount_percentage',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'affects_cash' => 'boolean',
        'is_customer_credit' => 'boolean',
        'discount_percentage' => 'decimal:2',
    ];


    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'is_active', 'affects_cash', 'discount_percentage'])
            ->useLogName('payment_method')
            ->logOnlyDirty();
    }

    /**
     * Venta cargada al correo del cliente (saldo a cobrar en cuenta corriente).
     */
    public function isSaleOnCustomerCredit(): bool
    {
        return $this->is_customer_credit === true;
    }

    /**
     * Suma para paid_amount / cobertura del total: todo lo recibido salvo el método cuenta corriente.
     * methods con affects_cash false (ej. pedidos app) cuentan como cobrado aunque no pasen por caja.
     */
    public static function paymentCountsTowardSalePaid(?self $method): bool
    {
        return $method !== null && ! $method->isSaleOnCustomerCredit();
    }

}
