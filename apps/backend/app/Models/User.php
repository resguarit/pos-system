<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, LogsActivity, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'person_id',
        'email',
        'username',
        'password',
        'active',
        'role_id',
        'hidden',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }

    /**
     * Get the person associated with the user.
     */
    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    /**
     * Get the role associated with the user.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the branches associated with the user.
     */
    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_user');
    }

    /**
     * Create a new user with person data.
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
            'phone' => $data['phone'] ?? null,
            'cuit' => $data['cuit'] ?? null,
            'fiscal_condition_id' => $data['fiscal_condition_id'] ?? null,
            'person_type_id' => $data['person_type_id'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
            'person_type' => 'user',
        ];

        // Create the person
        $person = Person::create($personData);

        // Create the user linked to this person
        return self::create([
            'person_id' => $person->id,
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => bcrypt($data['password']),
            'active' => $data['active'] ?? true,
            'role_id' => $data['role_id'] ?? null,
        ]);
    }

    /**
     * Update user and related person data
     *
     * @param array $data
     * @return bool
     */
    public function updateWithPerson(array $data): bool
    {
        // Extract person data
        $personData = [];
        foreach (['first_name', 'last_name', 'address', 'phone', 'cuit', 
                 'fiscal_condition_id', 'person_type_id', 'credit_limit'] as $field) {
            if (isset($data[$field])) {
                $personData[$field] = $data[$field];
            }
        }

        // Update person if we have data
        if (!empty($personData)) {
            $this->person->update($personData);
        }

        // Extract user data
        $userData = [];
        foreach (['email', 'username', 'active', 'role_id'] as $field) {
            if (isset($data[$field])) {
                $userData[$field] = $data[$field];
            }
        }

        // Handle password update separately
        if (isset($data['password']) && !empty($data['password'])) {
            $userData['password'] = bcrypt($data['password']);
        }

        // Update user if we have data
        if (!empty($userData)) {
            return $this->update($userData);
        }

        return true;
    }

    /**
     * Get user's full name by accessing the related person model
     */
    public function getFullNameAttribute(): string
    {
        return $this->person->full_name;
    }

    /**
     * Get the activity log options for the user.
     *
     * @return LogOptions
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll() // Registra todos los atributos
            ->logOnlyDirty() // Solo cambios
            ->useLogName('user'); // O el nombre que quieras
    }

    /**
     * Registrar login en activity_log
     */
    public static function logLogin(User $user, ?string $ip = null): void
    {
        activity('login')
            ->causedBy($user)
            ->performedOn($user)
            ->withProperties(['ip' => $ip ?? request()->ip()])
            ->log('login');
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permissionName): bool
    {
        if (!$this->role) {
            return false;
        }

        return $this->role->permissions()
            ->where('name', $permissionName)
            ->exists();
    }

    /**
     * Check if user can perform an action (alias for authorization)
     */
    public function can($ability, $arguments = []): bool
    {
        // First check Laravel's built-in authorization
        if (parent::can($ability, $arguments)) {
            return true;
        }

        // Then check custom permissions
        return $this->hasPermission($ability);
    }
}
