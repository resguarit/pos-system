<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Permission extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;
    
    protected $fillable = ['name', 'description', 'module'];

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'module'])
            ->useLogName('permission')
            ->logOnlyDirty();
    }
}
