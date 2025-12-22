<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Tenant extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'name',
        'code',
        'config'
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('tenant')
            ->logOnlyDirty();
    }

    protected $casts = [
        'config' => 'array'
    ];

    /**
     * Shipments belonging to this tenant
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}
