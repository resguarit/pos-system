<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ClientService extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'customer_id',
        'service_type_id',
        'name',
        'description',
        'amount',
        'base_price',
        'discount_percentage',
        'discount_notes',
        'billing_cycle',
        'next_billing_cycle',
        'start_date',
        'next_due_date',
        'status',
        'next_amount'
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('client_service')
            ->logOnlyDirty();
    }

    protected $casts = [
        'start_date' => 'date',
        'next_due_date' => 'date',
        'amount' => 'decimal:2',
        'next_amount' => 'decimal:2',
        'base_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function serviceType()
    {
        return $this->belongsTo(ServiceType::class);
    }

    public function payments()
    {
        return $this->hasMany(ClientServicePayment::class);
    }
}
