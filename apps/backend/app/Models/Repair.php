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
        'priority',
        'status',
        'intake_date',
        'estimated_date',
        'cost',
        'sale_price',
        'initial_notes',
        'delivered_at',
        'is_siniestro',
        'insurer_id',
        'siniestro_number',
        'insured_customer_id',
        'policy_number',
        'device_age',
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
        'cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_siniestro' => 'boolean',
    ];

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
}
