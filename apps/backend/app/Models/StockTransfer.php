<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class StockTransfer extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'source_branch_id',
        'destination_branch_id',
        'transfer_date',
        'status',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['source_branch_id', 'destination_branch_id', 'transfer_date', 'status', 'notes'])
            ->useLogName('stock_transfer')
            ->logOnlyDirty();
    }

    public function sourceBranch()
    {
        return $this->belongsTo(Branch::class, 'source_branch_id')->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function destinationBranch()
    {
        return $this->belongsTo(Branch::class, 'destination_branch_id')->withTrashed();
    }

    public function items()
    {
        return $this->hasMany(StockTransferItem::class);
    }

    /**
     * Scope para filtrar por sucursal de origen
     */
    public function scopeFromBranch($query, $branchId)
    {
        return $query->where('source_branch_id', $branchId);
    }

    /**
     * Scope para filtrar por sucursal de destino
     */
    public function scopeToBranch($query, $branchId)
    {
        return $query->where('destination_branch_id', $branchId);
    }

    /**
     * Scope para filtrar por cualquier sucursal (origen o destino)
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where(function ($q) use ($branchId) {
            $q->where('source_branch_id', $branchId)
                ->orWhere('destination_branch_id', $branchId);
        });
    }
}
