<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;
use Carbon\Carbon;

class CurrentAccount extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'customer_id',
        'credit_limit',
        'current_balance',
        'status',
        'notes',
        'opened_at',
        'closed_at',
        'last_movement_at',
    ];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'last_movement_at' => 'datetime',
    ];

    protected $appends = [
        'credit_limit',
        'available_credit',
        'credit_usage_percentage',
    ];

    /**
     * Relación con cliente
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relación con movimientos
     */
    public function movements(): HasMany
    {
        return $this->hasMany(CurrentAccountMovement::class)->orderBy('created_at', 'desc');
    }

    /**
     * Relación con ventas asociadas
     */
    public function sales(): HasMany
    {
        return $this->hasMany(SaleHeader::class, 'customer_id', 'customer_id');
    }

    /**
     * Verificar si la cuenta está activa
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Obtener límite de crédito desde el cliente
     * 
     * IMPORTANTE: Si credit_limit en la tabla es NULL, significa límite infinito
     * NO debe obtener el valor de person->credit_limit como fallback
     */
    public function getCreditLimitAttribute(): ?float
    {
        // Si credit_limit está definido explícitamente (no es null), usarlo
        if (isset($this->attributes['credit_limit'])) {
            $value = $this->attributes['credit_limit'];
            // Si es null explícitamente, retornar null (límite infinito)
            if ($value === null) {
                return null;
            }
            return (float) $value;
        }
        
        // No hay atributo definido, retornar null (límite infinito por defecto)
        return null;
    }

    /**
     * Verificar si hay crédito disponible para un monto específico
     */
    public function hasAvailableCredit(float $amount): bool
    {
        $creditLimit = $this->credit_limit;
        
        // Si credit_limit es NULL, significa límite infinito
        if ($creditLimit === null) {
            return true;
        }
        
        return ($this->current_balance + $amount) <= $creditLimit;
    }

    /**
     * Calcular crédito disponible
     */
    public function getAvailableCreditAttribute(): ?float
    {
        $creditLimit = $this->credit_limit;
        
        // Si credit_limit es NULL, significa límite infinito
        if ($creditLimit === null) {
            return null; // Representa límite infinito
        }
        
        // Balance positivo = deuda del cliente
        // Crédito disponible = Límite - Deuda
        // Si es negativo, significa que está sobregirado
        return $creditLimit - $this->current_balance;
    }

    /**
     * Verificar si la cuenta está en límite de crédito
     */
    public function isAtCreditLimit(): bool
    {
        // Si credit_limit es NULL, nunca está en límite (límite infinito)
        if ($this->credit_limit === null) {
            return false;
        }
        
        return $this->current_balance >= $this->credit_limit;
    }

    /**
     * Verificar si la cuenta está sobregirada
     */
    public function isOverdrawn(): bool
    {
        // Si credit_limit es NULL, nunca está sobregirada (límite infinito)
        if ($this->credit_limit === null) {
            return false;
        }
        
        return $this->current_balance > $this->credit_limit;
    }

    /**
     * Calcular porcentaje de uso del crédito
     */
    public function getCreditUsagePercentageAttribute(): ?float
    {
        // Si credit_limit es NULL, retornar null (límite infinito)
        if ($this->credit_limit === null || $this->credit_limit <= 0) {
            return null;
        }
        
        return min(100, ($this->current_balance / $this->credit_limit) * 100);
    }

    /**
     * Obtener el estado de la cuenta como texto legible
     */
    public function getStatusTextAttribute(): string
    {
        return match($this->status) {
            'active' => 'Activa',
            'suspended' => 'Suspendida',
            'closed' => 'Cerrada',
            default => 'Desconocido'
        };
    }

    /**
     * Obtener movimientos recientes
     */
    public function recentMovements(int $limit = 10): HasMany
    {
        return $this->movements()->limit($limit);
    }

    /**
     * Obtener movimientos por rango de fechas
     */
    public function movementsByDateRange(Carbon $from, Carbon $to): HasMany
    {
        return $this->movements()
            ->whereBetween('created_at', [$from, $to]);
    }

    /**
     * Calcular total de movimientos de entrada en un período
     */
    public function getTotalInflows(Carbon $from, Carbon $to): float
    {
        return $this->movementsByDateRange($from, $to)
            ->entradas()
            ->sum('amount');
    }

    /**
     * Calcular total de movimientos de salida en un período
     */
    public function getTotalOutflows(Carbon $from, Carbon $to): float
    {
        return $this->movementsByDateRange($from, $to)
            ->salidas()
            ->sum('amount');
    }

    /**
     * Actualizar el balance de la cuenta
     */
    public function updateBalance(float $amount): void
    {
        $this->current_balance += $amount;
        $this->last_movement_at = now();
        $this->save();
    }

    /**
     * Suspender la cuenta
     */
    public function suspend(?string $reason = null): void
    {
        $this->status = 'suspended';
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Suspendida: " . $reason;
        }
        $this->save();
    }

    /**
     * Reactivar la cuenta
     */
    public function reactivate(): void
    {
        $this->status = 'active';
        $this->save();
    }

    /**
     * Cerrar la cuenta
     */
    public function close(?string $reason = null): void
    {
        $this->status = 'closed';
        $this->closed_at = now();
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Cerrada: " . $reason;
        }
        $this->save();
    }

    /**
     * Scope para cuentas activas
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope para cuentas suspendidas
     */
    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    /**
     * Scope para cuentas cerradas
     */
    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    /**
     * Scope para cuentas con límite de crédito alcanzado
     */
    public function scopeAtCreditLimit($query)
    {
        return $query->whereRaw('current_balance >= credit_limit');
    }

    /**
     * Scope para cuentas con deuda (balance positivo = debe)
     */
    public function scopeOverdrawn($query)
    {
        return $query->where('current_balance', '>', 0);
    }
    
    /**
     * Scope para cuentas que excedieron su límite de crédito
     */
    public function scopeExceededCreditLimit($query)
    {
        return $query->whereRaw('current_balance > credit_limit');
    }

    /**
     * Scope para buscar por cliente
     */
    public function scopeByCustomer($query, int $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    /**
     * Scope para filtrar por rango de balance
     */
    public function scopeBalanceBetween($query, float $min, float $max)
    {
        return $query->whereBetween('current_balance', [$min, $max]);
    }

    /**
     * Scope para filtrar por rango de límite de crédito
     */
    public function scopeCreditLimitBetween($query, float $min, float $max)
    {
        return $query->whereBetween('credit_limit', [$min, $max]);
    }

    /**
     * Configuración para el log de actividades
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['customer_id', 'credit_limit', 'current_balance', 'status', 'notes'])
            ->useLogName('current_account')
            ->logOnlyDirty();
    }
}
