<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class CustomerTaxIdentity extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'customer_id',
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
     * Get the customer that owns this tax identity.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the fiscal condition associated with this tax identity.
     */
    public function fiscalCondition(): BelongsTo
    {
        return $this->belongsTo(FiscalCondition::class);
    }

    /**
     * Format the CUIT with dashes.
     */
    public function getFormattedCuitAttribute(): ?string
    {
        if (!$this->cuit) {
            return null;
        }
        
        // Format XX-XXXXXXXX-X
        $cuit = $this->cuit;
        if (strlen($cuit) == 11) {
            return substr($cuit, 0, 2) . '-' . substr($cuit, 2, 8) . '-' . substr($cuit, 10, 1);
        }
        
        return $cuit;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['customer_id', 'cuit', 'business_name', 'fiscal_condition_id', 'is_default', 'cbu', 'cbu_alias', 'bank_name', 'account_holder'])
            ->useLogName('customer_tax_identity')
            ->logOnlyDirty();
    }
}
