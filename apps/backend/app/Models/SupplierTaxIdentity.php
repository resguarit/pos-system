<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class SupplierTaxIdentity extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'supplier_id',
        'cuit',
        'business_name',
        'fiscal_condition_id',
        'is_default',
        'cbu',
        'cbu_alias',
        'bank_name',
        'account_holder',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($identity) {
            // Normalize CUIT by removing dashes
            if ($identity->cuit) {
                $identity->cuit = preg_replace('/[^0-9]/', '', $identity->cuit);
            }
        });

        static::updating(function ($identity) {
            // Normalize CUIT by removing dashes
            if ($identity->cuit) {
                $identity->cuit = preg_replace('/[^0-9]/', '', $identity->cuit);
            }
        });
    }

    /**
     * Get the supplier that owns this tax identity.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the fiscal condition for this identity.
     */
    public function fiscalCondition(): BelongsTo
    {
        return $this->belongsTo(FiscalCondition::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['cuit', 'business_name', 'fiscal_condition_id', 'is_default', 'cbu', 'cbu_alias', 'bank_name', 'account_holder'])
            ->useLogName('supplier_tax_identity')
            ->logOnlyDirty();
    }
}
