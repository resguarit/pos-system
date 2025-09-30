<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
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
            ->useLogName('DocumentType')
            ->setDescriptionForEvent(fn (string $eventName) => "DocumentType {$eventName}");
    }
}
