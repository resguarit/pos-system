<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RepairPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'repair_id',
        'payment_method_id',
        'cash_movement_id',
        'amount',
        'charge_with_iva',
        'paid_at',
        'is_reversed',
        'reversed_at',
        'user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'charge_with_iva' => 'boolean',
        'paid_at' => 'datetime',
        'is_reversed' => 'boolean',
        'reversed_at' => 'datetime',
    ];

    public function repair()
    {
        return $this->belongsTo(Repair::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function cashMovement()
    {
        return $this->belongsTo(CashMovement::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}