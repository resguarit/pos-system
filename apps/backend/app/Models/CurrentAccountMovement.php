<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurrentAccountMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'current_account_id',
        'movement_type_id',
        'amount',
        'description',
        'reference',
        'sale_id',
        'balance_before',
        'balance_after',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
    ];

    /**
     * Relación con cuenta corriente
     */
    public function currentAccount()
    {
        return $this->belongsTo(CurrentAccount::class);
    }

    /**
     * Relación con tipo de movimiento
     */
    public function movementType()
    {
        return $this->belongsTo(MovementType::class);
    }

    /**
     * Relación con venta (opcional)
     */
    public function sale()
    {
        return $this->belongsTo(SaleHeader::class, 'sale_id');
    }

    /**
     * Scope para movimientos de entrada
     */
    public function scopeEntradas($query)
    {
        return $query->whereHas('movementType', function($q) {
            $q->where('operation_type', 'entrada');
        });
    }

    /**
     * Scope para movimientos de salida
     */
    public function scopeSalidas($query)
    {
        return $query->whereHas('movementType', function($q) {
            $q->where('operation_type', 'salida');
        });
    }
}
