<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Shipment extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'reference',
        'metadata',
        'current_stage_id',
        'version',
        'created_by',
        'branch_id',
        'tenant_id',
        'shipping_address',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'priority',
        'estimated_delivery_date',
        'notes',
        'shipping_cost',
        'is_paid',
        'payment_date',
    ];
    
    protected $guarded = []; // Allow mass assignment for all fields

    protected $casts = [
        'metadata' => 'array',
        'version' => 'integer',
        'estimated_delivery_date' => 'date',
        'shipping_cost' => 'decimal:2',
        'is_paid' => 'boolean',
        'payment_date' => 'datetime',
    ];

    /**
     * Get the attributes that should not be included in the activity log.
     */
    public function getOnlyDirtyOnUpdate(): bool
    {
        return false;
    }

    /**
     * Get the current stage of the shipment.
     */
    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(ShipmentStage::class, 'current_stage_id');
    }

    /**
     * Get the user who created the shipment.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the branch for this shipment.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    /**
     * Get the sales associated with this shipment.
     */
    public function sales(): BelongsToMany
    {
        return $this->belongsToMany(SaleHeader::class, 'shipment_sale', 'shipment_id', 'sale_id');
    }

    /**
     * Get the events for this shipment.
     */
    public function events(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get the transporter user from metadata.
     */
    public function getTransporterAttribute()
    {
        if (isset($this->metadata['transportista_id'])) {
            return User::with('person')->find($this->metadata['transportista_id']);
        }
        return null;
    }

    /**
     * Increment version for optimistic locking.
     */
    public function incrementVersion(): void
    {
        $this->increment('version');
    }

    /**
     * Check if shipment can be moved to a specific stage.
     */
    public function canMoveTo(ShipmentStage $stage): bool
    {
        // Basic validation - can be extended with business rules
        return $stage->active && $stage->id !== $this->current_stage_id;
    }

    /**
     * Move shipment to a new stage.
     */
    public function moveToStage(ShipmentStage $stage, ?User $user = null, array $metadata = []): void
    {
        $fromStage = $this->currentStage;
        
        $this->current_stage_id = $stage->id;
        $this->incrementVersion();
        $this->save();

        // Create event record
        $this->events()->create([
            'user_id' => $user?->id,
            'from_stage_id' => $fromStage?->id,
            'to_stage_id' => $stage->id,
            'metadata' => $metadata,
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['reference', 'metadata', 'current_stage_id', 'version'])
            ->useLogName('shipment')
            ->logOnlyDirty();
    }
}