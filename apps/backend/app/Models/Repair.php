<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Repair extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'code',
        'customer_id',
        'branch_id',
        'technician_id',
        'category_id',
        'sale_id',
        'device',
        'serial_number',
        'issue_description',
        'diagnosis',
        'no_repair_reason',
        'priority',
        'status',
        'intake_date',
        'estimated_date',
        'cost',
        'sale_price',
        'initial_notes',
        'delivered_at',
        'no_repair_at',
        'is_no_repair',
        'is_siniestro',
        'insurer_id',
        'siniestro_number',
        'insured_customer_id',
        'policy_number',
        'device_age',
        'is_paid',
        'payment_method_id',
        'amount_paid',
        'paid_at',
        'cash_movement_id',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('repair')
            ->logOnlyDirty();
    }

    protected $casts = [
        'intake_date' => 'date',
        'estimated_date' => 'date',
        'delivered_at' => 'datetime',
        'no_repair_at' => 'datetime',
        'cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_no_repair' => 'boolean',
        'is_siniestro' => 'boolean',
        'is_paid' => 'boolean',
        'amount_paid' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // Boot method to handle automatic timestamps
    protected static function boot()
    {
        parent::boot();

        static::saving(function (self $repair) {
            // If transitioning to is_no_repair = true and no_repair_at is not already set,
            // set it to now
            if ($repair->isDirty('is_no_repair') && $repair->is_no_repair && !$repair->no_repair_at) {
                $repair->no_repair_at = now();
            }
        });
    }

    // Relationships
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function notes()
    {
        return $this->hasMany(RepairNote::class);
    }

    public function sale()
    {
        return $this->belongsTo(SaleHeader::class, 'sale_id');
    }

    public function insurer()
    {
        return $this->belongsTo(Insurer::class);
    }

    public function insuredCustomer()
    {
        return $this->belongsTo(Customer::class, 'insured_customer_id');
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function cashMovement()
    {
        return $this->belongsTo(CashMovement::class);
    }}