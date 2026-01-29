<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Branch extends Model
{
    use HasFactory, LogsActivity, SoftDeletes, LogsActivityWithContext;

    protected $table = 'branches';

    protected $fillable = [
        'description',
        'address',
        'phone',
        'email',
        'manager_id',
        'status',
        'point_of_sale',
        'color',
        'cuit',
        'razon_social',
        'domicilio_comercial',
        'iibb',
        'start_date',
        'enabled_receipt_types',
    ];

    protected $casts = [
        'enabled_receipt_types' => 'array',
        'status' => 'boolean',
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

    /**
     * Get the cash registers for this branch.
     */
    public function cashRegisters()
    {
        return $this->hasMany(CashRegister::class);
    }

    /**
     * Get the cash movements for this branch.
     */
    public function cashMovements()
    {
        return $this->hasManyThrough(CashMovement::class, CashRegister::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['description', 'address', 'phone', 'email', 'manager_id', 'status'])
            ->useLogName('branch')
            ->logOnlyDirty();
    }
}
