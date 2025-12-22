<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ProductCostHistory extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'product_id',
        'previous_cost',
        'new_cost',
        'currency',
        'source_type',
        'source_id',
        'notes',
        'user_id',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('product_cost_history')
            ->logOnlyDirty();
    }

    protected $casts = [
        'previous_cost' => 'decimal:2',
        'new_cost' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación con el producto
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Relación con el usuario que realizó el cambio
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obtener el cambio porcentual
     */
    public function getPercentageChangeAttribute(): ?float
    {
        if ($this->previous_cost === null || $this->previous_cost == 0) {
            return null;
        }

        return (($this->new_cost - $this->previous_cost) / $this->previous_cost) * 100;
    }

    /**
     * Obtener el cambio absoluto
     */
    public function getAbsoluteChangeAttribute(): ?float
    {
        if ($this->previous_cost === null) {
            return $this->new_cost;
        }

        return $this->new_cost - $this->previous_cost;
    }
}
