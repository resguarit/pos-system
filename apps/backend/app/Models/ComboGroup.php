<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ComboGroup extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'combo_id',
        'name',
        'required_quantity',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('combo_group')
            ->logOnlyDirty();
    }

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Combo::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(ComboGroupOption::class);
    }
}
