<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Stock extends Model
{
    use HasFactory, LogsActivity, SoftDeletes, LogsActivityWithContext;

    protected $fillable = [
        'branch_id', 
        'product_id', 
        'current_stock', 
        'min_stock', 
        'max_stock'
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['branch_id', 'product_id', 'current_stock', 'min_stock', 'max_stock'])
            ->useLogName('stock')
            ->logOnlyDirty();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}