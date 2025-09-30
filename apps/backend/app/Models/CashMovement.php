<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Events\CashMovementCreated;

class CashMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_id',
        'movement_type_id',
        'reference_type',
        'reference_id',
        'amount',
        'description',
        'user_id',
        'payment_method_id',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
    ];

    protected $dispatchesEvents = [
        'created' => CashMovementCreated::class,
    ];

    public function cashRegister()
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function movementType()
    {
        return $this->belongsTo(MovementType::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }

    public function currentAccountMovement()
    {
        return $this->hasOne(CurrentAccountMovement::class);
    }
}
