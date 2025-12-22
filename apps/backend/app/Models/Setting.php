<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Setting extends Model
{
    use LogsActivity, LogsActivityWithContext;

    protected $fillable = ['key', 'value'];

    protected $casts = [
        'value' => 'json'
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('setting')
            ->logOnlyDirty();
    }
}
