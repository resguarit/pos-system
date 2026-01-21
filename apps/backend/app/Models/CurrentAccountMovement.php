<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Carbon\Carbon;
use App\Traits\LogsActivityWithContext;

class CurrentAccountMovement extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'current_account_id',
        'movement_type_id',
        'amount',
        'description',
        'reference',
        'sale_id',
        'purchase_order_id',
        'balance_before',
        'balance_after',
        'metadata',
        'user_id',
        'movement_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
        'movement_date' => 'datetime',
    ];

    /**
     * Relación con cuenta corriente
     */
    public function currentAccount(): BelongsTo
    {
        return $this->belongsTo(CurrentAccount::class);
    }

    /**
     * Relación con tipo de movimiento
     */
    public function movementType(): BelongsTo
    {
        return $this->belongsTo(MovementType::class);
    }

    /**
     * Relación con venta (opcional)
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(SaleHeader::class, 'sale_id');
    }

    /**
     * Relación con orden de compra (opcional)
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    /**
     * Relación con usuario que realizó el movimiento
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Verificar si es un movimiento de entrada
     */
    public function isInflow(): bool
    {
        return $this->movementType !== null && $this->movementType->operation_type === 'entrada';
    }

    /**
     * Verificar si es un movimiento de salida
     */
    public function isOutflow(): bool
    {
        return $this->movementType !== null && $this->movementType->operation_type === 'salida';
    }

    /**
     * Obtener el tipo de operación del movimiento
     */
    public function getOperationTypeAttribute(): string
    {
        return $this->movementType !== null ? ($this->movementType->operation_type ?? 'unknown') : 'unknown';
    }

    /**
     * Obtener el nombre del tipo de movimiento
     */
    public function getMovementTypeNameAttribute(): string
    {
        return $this->movementType ? $this->movementType->name : 'Sin tipo';
    }

    /**
     * Obtener el nombre del usuario que realizó el movimiento
     */
    public function getUserNameAttribute(): string
    {
        return $this->user ? $this->user->person->full_name : 'Sistema';
    }

    /**
     * Obtener el nombre del cliente asociado
     */
    public function getCustomerNameAttribute(): string
    {
        return $this->currentAccount && $this->currentAccount->customer
            ? $this->currentAccount->customer->full_name
            : 'Cliente desconocido';
    }

    /**
     * Scope para movimientos de entrada
     */
    public function scopeEntradas($query)
    {
        return $query->whereHas('movementType', function ($q) {
            $q->where('operation_type', 'entrada');
        });
    }

    /**
     * Scope para movimientos de salida
     */
    public function scopeSalidas($query)
    {
        return $query->whereHas('movementType', function ($q) {
            $q->where('operation_type', 'salida');
        });
    }

    /**
     * Scope para movimientos por cuenta corriente
     */
    public function scopeByAccount($query, int $accountId)
    {
        return $query->where('current_account_id', $accountId);
    }

    /**
     * Scope para movimientos por cliente
     */
    public function scopeByCustomer($query, int $customerId)
    {
        return $query->whereHas('currentAccount', function ($q) use ($customerId) {
            $q->where('customer_id', $customerId);
        });
    }

    /**
     * Scope para movimientos por tipo
     */
    public function scopeByMovementType($query, int $movementTypeId)
    {
        return $query->where('movement_type_id', $movementTypeId);
    }

    /**
     * Scope para movimientos por usuario
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope para movimientos por rango de fechas
     */
    public function scopeByDateRange($query, Carbon $from, Carbon $to)
    {
        return $query->whereBetween('movement_date', [$from, $to]);
    }

    /**
     * Scope para movimientos por rango de montos
     */
    public function scopeByAmountRange($query, float $min, float $max)
    {
        return $query->whereBetween('amount', [$min, $max]);
    }

    /**
     * Scope para movimientos relacionados con ventas
     */
    public function scopeRelatedToSales($query)
    {
        return $query->whereNotNull('sale_id');
    }

    /**
     * Scope para movimientos de pago
     */
    public function scopePayments($query)
    {
        return $query->whereHas('movementType', function ($q) {
            $q->where('name', 'like', '%pago%')
                ->orWhere('name', 'like', '%payment%');
        });
    }

    /**
     * Scope para movimientos de compra
     */
    public function scopePurchases($query)
    {
        return $query->whereHas('movementType', function ($q) {
            $q->where('name', 'like', '%compra%')
                ->orWhere('name', 'like', '%purchase%');
        });
    }

    /**
     * Scope para movimientos recientes
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('movement_date', '>=', now()->subDays($days));
    }

    /**
     * Scope para ordenar por fecha de movimiento
     */
    public function scopeOrderByMovementDate($query, string $direction = 'desc')
    {
        return $query->orderBy('movement_date', $direction);
    }

    /**
     * Scope para ordenar por fecha de creación
     */
    public function scopeOrderByCreatedAt($query, string $direction = 'desc')
    {
        return $query->orderBy('created_at', $direction);
    }

    /**
     * Scope para buscar por descripción
     */
    public function scopeSearchByDescription($query, string $search)
    {
        return $query->where('description', 'like', "%{$search}%");
    }

    /**
     * Scope para buscar por referencia
     */
    public function scopeSearchByReference($query, string $search)
    {
        return $query->where('reference', 'like', "%{$search}%");
    }

    /**
     * Configuración para el log de actividades
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['current_account_id', 'movement_type_id', 'amount', 'description', 'reference', 'sale_id', 'purchase_order_id'])
            ->useLogName('current_account_movement')
            ->logOnlyDirty();
    }
}
