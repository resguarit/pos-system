<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ShipmentStage extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'name',
        'description',
        'order',
        'config',
        'is_active',
    ];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the shipments in this stage.
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'current_stage_id');
    }

    /**
     * Get the roles that can access this stage.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'shipment_stage_role');
    }

    /**
     * Get the visibility rules for this stage.
     */
    public function visibilityRules(): HasMany
    {
        return $this->hasMany(ShipmentRoleAttributeVisibility::class, 'stage_id');
    }

    /**
     * Get shipment events that occurred in this stage.
     */
    public function eventsFrom(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class, 'from_stage_id');
    }

    /**
     * Get shipment events that moved to this stage.
     */
    public function eventsTo(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class, 'to_stage_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'order', 'config', 'is_active'])
            ->useLogName('shipment_stage')
            ->logOnlyDirty();
    }
}