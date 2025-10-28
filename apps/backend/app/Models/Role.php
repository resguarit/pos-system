<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Role extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the users with this role.
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * The permissions that belong to the role.
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class);
    }

    /**
     * Get the shipment stages this role can access.
     */
    public function shipmentStages()
    {
        return $this->belongsToMany(ShipmentStage::class, 'shipment_stage_role', 'role_id', 'stage_id');
    }

    /**
     * Get the visibility rules for this role.
     */
    public function shipmentVisibilityRules()
    {
        return $this->hasMany(ShipmentRoleAttributeVisibility::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'active'])
            ->useLogName('role')
            ->logOnlyDirty();
    }
}
