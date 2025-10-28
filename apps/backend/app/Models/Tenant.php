<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'config'
    ];

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
