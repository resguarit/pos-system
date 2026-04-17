<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubcontractedService extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'repair_id',
        'provider_id',
        'branch_id',
        'title',
        'status',
        'provider_cost',
        'customer_price',
        'provider_account_entry_id',
        'sale_id',
        'is_provider_paid',
        'is_customer_charged',
        'supplier_id',
        'current_account_id',
        'charge_movement_id',
        'description',
        'notes',
        'agreed_cost',
        'paid_amount',
        'payment_status',
        'fully_paid_at',
    ];

    protected $casts = [
        'provider_cost' => 'decimal:2',
        'customer_price' => 'decimal:2',
        'agreed_cost' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'is_provider_paid' => 'boolean',
        'is_customer_charged' => 'boolean',
        'fully_paid_at' => 'datetime',
    ];

    protected $appends = [
        'pending_amount',
    ];

    public function repair(): BelongsTo
    {
        return $this->belongsTo(Repair::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function currentAccount(): BelongsTo
    {
        return $this->belongsTo(CurrentAccount::class);
    }

    public function chargeMovement(): BelongsTo
    {
        return $this->belongsTo(CurrentAccountMovement::class, 'charge_movement_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubcontractedServicePayment::class)->latest('id');
    }

    public function getPendingAmountAttribute(): float
    {
        $agreedCost = (float) ($this->agreed_cost ?? 0);
        $paidAmount = (float) ($this->paid_amount ?? 0);

        return max(0, round($agreedCost - $paidAmount, 2));
    }
}
