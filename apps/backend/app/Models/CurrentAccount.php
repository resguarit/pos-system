<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurrentAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'credit_limit',
        'current_balance',
        'status',
        'notes',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    /**
     * Relación con cliente
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relación con movimientos
     */
    public function movements()
    {
        return $this->hasMany(CurrentAccountMovement::class);
    }

    /**
     * Verificar si la cuenta está activa
     */
    public function isActive()
    {
        return $this->status === 'active';
    }

    /**
     * Verificar si hay crédito disponible
     */
    public function hasAvailableCredit($amount)
    {
        return ($this->current_balance + $amount) <= $this->credit_limit;
    }

    /**
     * Calcular balance disponible
     */
    public function getAvailableCreditAttribute()
    {
        return $this->credit_limit - $this->current_balance;
    }

    /**
     * Scope para cuentas activas
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
