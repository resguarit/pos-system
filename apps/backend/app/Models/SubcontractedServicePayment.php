<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubcontractedServicePayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'subcontracted_service_id',
        'current_account_movement_id',
        'payment_method_id',
        'amount',
        'notes',
        'paid_at',
        'user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function subcontractedService(): BelongsTo
    {
        return $this->belongsTo(SubcontractedService::class);
    }

    public function currentAccountMovement(): BelongsTo
    {
        return $this->belongsTo(CurrentAccountMovement::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
