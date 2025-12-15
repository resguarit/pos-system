<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Repair extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'customer_id',
        'branch_id',
        'technician_id',
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
    ];

    protected $casts = [
        'intake_date' => 'date',
        'estimated_date' => 'date',
        'delivered_at' => 'datetime',
        'cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
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
}
