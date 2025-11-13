<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Events\CashMovementCreated;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class CashMovement extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'cash_register_id',
        'movement_type_id',
        'reference_type',
        'reference_id',
        'amount',
        'description',
        'user_id',
        'payment_method_id',
        'affects_balance',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'affects_balance' => 'boolean',
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

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'cash_register_id', 'movement_type_id', 'reference_type', 'reference_id',
                'amount', 'description', 'user_id', 'payment_method_id', 'affects_balance'
            ])
            ->useLogName('cash_movement')
            ->logOnlyDirty();
    }
}
