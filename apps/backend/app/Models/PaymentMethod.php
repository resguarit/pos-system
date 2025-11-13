<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Opcional: si usas SoftDeletes
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class PaymentMethod extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;
    // use SoftDeletes; // Opcional: si usas SoftDeletes

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'affects_cash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'affects_cash' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'is_active', 'affects_cash'])
            ->useLogName('payment_method')
            ->logOnlyDirty();
    }
}
