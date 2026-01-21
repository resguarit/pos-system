<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Supplier extends Model
{
    use HasFactory, LogsActivity, SoftDeletes, LogsActivityWithContext;

    protected $fillable = ['name', 'contact_name', 'phone', 'email', 'cuit', 'address', 'status'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'contact_name', 'phone', 'email', 'address', 'status'])
            ->useLogName('supplier')
            ->logOnlyDirty();
    }

    // Relación con persona (si existe person_id en la tabla suppliers)
    public function person()
    {
        return $this->belongsTo(Person::class, 'person_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id');
    }

    /**
     * Get the current account associated with the supplier.
     */
    public function currentAccount(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(CurrentAccount::class);
    }
}