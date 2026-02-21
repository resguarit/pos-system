<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ComboGroupOption extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'combo_group_id',
        'product_id',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('combo_group_option')
            ->logOnlyDirty();
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(ComboGroup::class, 'combo_group_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
