<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class DocumentType extends Model
{
    use LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'name',
        'code',
    ];

    /**
     * Get the options for logging.
     *
     * @return LogOptions
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'code'])
            ->useLogName('document_type')
            ->logOnlyDirty();
    }
}
