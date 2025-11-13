<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Person extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'last_name',
        'first_name',
        'address',
        'city',
        'state',
        'postal_code',
        'phone',
        'cuit',
        'fiscal_condition_id',
        'person_type_id',
        'credit_limit',
        'person_type',
        'document_type_id',
        'documento',
    ];

    protected $casts = [
        'credit_limit' => 'float',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($person) {
            // Normalizar el CUIT eliminando guiones
            if ($person->cuit) {
                $person->cuit = preg_replace('/[^0-9]/', '', $person->cuit);
            }
        });
    }

    /**
     * Get the fiscal condition associated with the person.
     */
    public function fiscalCondition()
    {
        return $this->belongsTo(FiscalCondition::class);
    }

    /**
     * Get the person type associated with the person.
     */
    public function personType()
    {
        return $this->belongsTo(PersonType::class);
    }

    /**
     * Get the customer associated with the person.
     */
    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    /**
     * Get the user associated with the person.
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    /**
     * Get the supplier associated with the person.
     */
    public function supplier(): HasOne
    {
        // Asume que la clave foránea 'person_id' está en la tabla 'suppliers'
        return $this->hasOne(Supplier::class);
    }

    /**
     * Get the document type associated with the person.
     */
    public function documentType()
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }

    /**
     * Get the full name of the person.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Format the CUIT with dashes.
     */
    public function getFormattedCuitAttribute(): ?string
    {
        if (!$this->cuit) {
            return null;
        }
        
        // Formato XX-XXXXXXXX-X
        $cuit = $this->cuit;
        if (strlen($cuit) == 11) {
            return substr($cuit, 0, 2) . '-' . substr($cuit, 2, 8) . '-' . substr($cuit, 10, 1);
        }
        
        return $cuit;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'last_name', 
                'first_name', 
                'address',
                'city',
                'state',
                'postal_code',
                'phone', 
                'cuit', 
                'fiscal_condition_id', 
                'person_type_id', 
                'credit_limit', 
                'person_type',
                'document_type_id',
                'documento'
            ])
            ->useLogName('person')
            ->logOnlyDirty();
    }
}
