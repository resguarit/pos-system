<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ShipmentRoleAttributeVisibility extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $table = 'shipment_role_attribute_visibility';

    protected $fillable = [
        'stage_id',
        'role_id',
        'attribute',
        'visible',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('shipment_role_attribute_visibility')
            ->logOnlyDirty();
    }

    protected $casts = [
        'visible' => 'boolean',
    ];

    /**
     * Get the stage this visibility rule belongs to.
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(ShipmentStage::class, 'stage_id');
    }

    /**
     * Get the role this visibility rule applies to.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}