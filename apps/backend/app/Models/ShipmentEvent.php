<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ShipmentEvent extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'shipment_id',
        'user_id',
        'from_stage_id',
        'to_stage_id',
        'metadata',
        'ip',
        'user_agent',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('shipment_event')
            ->logOnlyDirty();
    }

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Get the shipment this event belongs to.
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Get the user who triggered this event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the stage this event moved from.
     */
    public function fromStage(): BelongsTo
    {
        return $this->belongsTo(ShipmentStage::class, 'from_stage_id');
    }

    /**
     * Get the stage this event moved to.
     */
    public function toStage(): BelongsTo
    {
        return $this->belongsTo(ShipmentStage::class, 'to_stage_id');
    }
}