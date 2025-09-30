<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Branch extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'branches';

    protected $fillable = [
        'description', 'address', 'phone', 'email', 'manager_id', 'status', 'point_of_sale', 'color'
    ];

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }
    
    /**
     * Get the users (employees) associated with the branch.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['description', 'address', 'phone', 'email', 'manager_id', 'status'])
            ->useLogName('branch')
            ->logOnlyDirty();
    }
}
