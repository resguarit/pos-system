<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class MovementType extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'name',
        'description',
        'operation_type',
        'is_cash_movement',
        'is_current_account_movement',
        'active',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('movement_type')
            ->logOnlyDirty();
    }

    protected $casts = [
        'is_cash_movement' => 'boolean',
        'is_current_account_movement' => 'boolean',
        'active' => 'boolean',
    ];

    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class);
    }

    public function currentAccountMovements()
    {
        return $this->hasMany(CurrentAccountMovement::class);
    }

    /**
     * Scope para movimientos de caja
     */
    public function scopeCashMovements($query)
    {
        return $query->where('is_cash_movement', true);
    }

    /**
     * Scope para movimientos de cuenta corriente
     */
    public function scopeCurrentAccountMovements($query)
    {
        return $query->where('is_current_account_movement', true);
    }

    /**
     * Scope para movimientos activos
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
