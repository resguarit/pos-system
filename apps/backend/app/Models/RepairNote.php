<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class RepairNote extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'repair_id',
        'user_id',
        'note',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('repair_note')
            ->logOnlyDirty();
    }

    public function repair()
    {
        return $this->belongsTo(Repair::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
