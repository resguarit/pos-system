<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Models\Person;
use App\Traits\LogsActivityWithContext;

class Customer extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'person_id',
        'email',
        'active',
        'notes',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the person associated with the customer.
     */
    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'person_id');
    }

    /**
     * Get the tax identities for the customer.
     */
    public function taxIdentities(): HasMany
    {
        return $this->hasMany(CustomerTaxIdentity::class);
    }

    /**
     * Get the default tax identity for the customer.
     */
    public function defaultTaxIdentity()
    {
        return $this->hasOne(CustomerTaxIdentity::class)->where('is_default', true);
    }

    /**
     * Create a new customer with person data.
     *
     * @param array $data
     * @return self
     */
    public static function createWithPerson(array $data): self
    {
        // Extract person data
        $personData = [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'phone' => $data['phone'] ?? null,
            'cuit' => $data['cuit'] ?? null,
            'fiscal_condition_id' => $data['fiscal_condition_id'] ?? null,
            'person_type_id' => $data['person_type_id'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
            'person_type' => 'customer',
        ];

        // Create the person
        $person = Person::create($personData);

        // Create the customer linked to this person
        return self::create([
            'person_id' => $person->id,
            'email' => $data['email'] ?? null,
            'active' => $data['active'] ?? true,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Update customer and related person data
     *
     * @param array $data
     * @return bool
     */
    public function updateWithPerson(array $data): bool
    {
        // Extract person data
        $personData = [];
        foreach (['first_name', 'last_name', 'address', 'city', 'state', 'postal_code', 'phone', 'cuit', 
                 'fiscal_condition_id', 'person_type_id', 'credit_limit'] as $field) {
            if (isset($data[$field])) {
                $personData[$field] = $data[$field];
            }
        }

        // Update person if we have data
        if (!empty($personData)) {
            $this->person->update($personData);
        }

        // Extract customer data
        $customerData = [];
        foreach (['email', 'active', 'notes'] as $field) {
            if (isset($data[$field])) {
                $customerData[$field] = $data[$field];
            }
        }

        // Update customer if we have data
        if (!empty($customerData)) {
            return $this->update($customerData);
        }

        return true;
    }

    /**
     * Get customer's full name by accessing the related person model
     */
    public function getFullNameAttribute(): string
    {
        return $this->person->full_name;
    }

    /**
     * Relación con cuenta corriente
     */
    public function currentAccount()
    {
        return $this->hasOne(CurrentAccount::class);
    }

    /**
     * Relación con ventas
     */
    public function sales()
    {
        return $this->hasMany(SaleHeader::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['person_id', 'email', 'active', 'notes'])
            ->useLogName('customer')
            ->logOnlyDirty();
    }
}
