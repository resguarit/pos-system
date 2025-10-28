<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryZone extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'postal_codes',
        'base_cost',
        'cost_per_km',
        'estimated_time',
        'active',
    ];

    protected $casts = [
        'postal_codes' => 'array',
        'base_cost' => 'decimal:2',
        'cost_per_km' => 'decimal:2',
        'active' => 'boolean',
    ];

    /**
     * Get shipments for this zone
     */
    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'zone_id');
    }
}
