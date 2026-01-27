<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class StockMovement extends Model
{
    use LogsActivity, LogsActivityWithContext;
    protected $fillable = [
        'product_id',
        'branch_id',
        'quantity',
        'type',
        'reference_type',
        'reference_id',
        'user_id',
        'current_stock_balance',
        'unit_price_snapshot',
        'sale_price_snapshot',
        'notes'
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('stock_movement')
            ->logOnlyDirty();
    }

    /**
     * Get the product associated with the movement.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the branch associated with the movement.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the user who caused the movement.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reference model (Sale, PurchaseOrder, etc.).
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
