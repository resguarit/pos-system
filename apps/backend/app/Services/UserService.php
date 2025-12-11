<?php

namespace App\Services;

use App\Models\User;
use App\Models\Person;
use App\Services\PersonService;
use App\Interfaces\UserServiceInterface; // Import the interface
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Exception;

class UserService implements UserServiceInterface // Implement the interface
{
    protected $personService;

    public function __construct(PersonService $personService)
    {
        $this->personService = $personService;
    }

    /**
     * Get all users, potentially with their person data.
     */
    public function getAllUsers()
    {
        // Eager load person, role y branches, y obtener el último acceso desde personal_access_tokens
        $users = User::with(['person', 'role', 'branches'])
            ->get();
        // ->map(function ($user) {
        //     // Buscar el último last_used_at de los tokens del usuario
        //     $lastToken = DB::table('personal_access_tokens')
        //         ->where('tokenable_id', $user->id)
        //         ->where('tokenable_type', User::class)
        //         ->orderByDesc('last_used_at')
        //         ->orderByDesc('created_at')
        //         ->first();
        //     $user->last_login_at = $lastToken?->last_used_at ?? $lastToken?->created_at;
        //     return $user;
        // });
        return $users;
    }

    /**
     * Get a single user by ID, with person and role data.
     */
    public function getUserById(int $id): ?User
    {
        return User::with(['person', 'role'])->find($id);
    }

    /**
     * Create a new user and associated person.
     */
    /**
     * Create a new user and associated person.
     */
    public function createUser(array $data): User
    {
        // Normalizar payload desde frontend (person.* y posibles camelCase)
        if (isset($data['person']) && is_array($data['person'])) {
            $data = array_merge($data, $data['person']);
        }
        if (isset($data['roleId']) && !isset($data['role_id'])) {
            $data['role_id'] = $data['roleId'];
        }
        if (isset($data['firstName']) && !isset($data['first_name'])) {
            $data['first_name'] = $data['firstName'];
        }
        if (isset($data['lastName']) && !isset($data['last_name'])) {
            $data['last_name'] = $data['lastName'];
        }

        // Validación de requeridos según backend
        if (empty($data['email']) || empty($data['username']) || empty($data['password']) || empty($data['role_id'])) {
            throw new Exception("Missing required fields for user creation.");
        }

        // Si no se vincula a un empleado existente, requerimos nombre y apellido
        if (empty($data['employee_id']) && (empty($data['first_name']) || empty($data['last_name']))) {
            throw new Exception("Missing required fields (Name) for user creation.");
        }

        DB::beginTransaction();
        try {
            $personId = null;
            $employee = null;

            // Caso 1: Vincular con empleado existente
            if (!empty($data['employee_id'])) {
                $employee = \App\Models\Employee::findOrFail($data['employee_id']);
                $personId = $employee->person_id;
            }
            // Caso 2: Crear nueva persona
            else {
                $person = $this->personService->createPerson([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'cuit' => $data['cuit'] ?? null,
                    'address' => $data['address'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'fiscal_condition_id' => $data['fiscal_condition_id'] ?? null,
                    'person_type_id' => $data['person_type_id'] ?? null,
                ]);
                $personId = $person->id;
            }

            // 2. Create User linked to Person
            $user = User::create([
                'person_id' => $personId,
                'email' => $data['email'],
                'username' => $data['username'],
                'password' => Hash::make($data['password']),
                'active' => $data['active'] ?? true,
                'role_id' => $data['role_id'],
            ]);

            // Si se vinculó a un empleado existente, actualizar el user_id del empleado
            if ($employee) {
                $employee->user_id = $user->id;
                $employee->save();
            }

            // Caso 3: Crear nuevo empleado (si se solicitó y no se vinculó a uno existente)
            if (empty($data['employee_id']) && !empty($data['is_employee']) && $data['is_employee'] === true) {
                // Obtener el nombre del rol para el puesto
                $roleName = \App\Models\Role::find($data['role_id'])?->name ?? 'Empleado';

                // Usar la primera sucursal asignada o la primera disponible
                $branchId = null;
                if (!empty($data['branches']) && is_array($data['branches']) && count($data['branches']) > 0) {
                    $branchId = $data['branches'][0];
                } else {
                    $branchId = \App\Models\Branch::first()?->id;
                }

                if ($branchId) {
                    \App\Models\Employee::create([
                        'person_id' => $personId,
                        'user_id' => $user->id,
                        'branch_id' => $branchId,
                        'job_title' => $roleName,
                        'salary' => 0, // Default salary
                        'hire_date' => now(),
                        'status' => 'active',
                    ]);
                }
            }

            // 3. Sincronizar sucursales si vienen en el payload
            if (!empty($data['branches']) && is_array($data['branches'])) {
                $user->branches()->sync($data['branches']);
            }

            DB::commit();
            // Eager load person and role data for the returned user
            return $user->load(['person', 'role']);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creating user: " . $e->getMessage());
            throw new Exception("Failed to create user. " . $e->getMessage());
        }
    }

    /**
     * Update an existing user and their associated person data.
     */
    public function updateUser(int $id, array $data): User
    {
        // Normalizar payload desde frontend (person.* y posibles camelCase)
        if (isset($data['person']) && is_array($data['person'])) {
            $data = array_merge($data, $data['person']);
        }
        if (isset($data['roleId']) && !isset($data['role_id'])) {
            $data['role_id'] = $data['roleId'];
        }
        if (isset($data['firstName']) && !isset($data['first_name'])) {
            $data['first_name'] = $data['firstName'];
        }
        if (isset($data['lastName']) && !isset($data['last_name'])) {
            $data['last_name'] = $data['lastName'];
        }

        DB::beginTransaction();
        try {
            $user = $this->getUserById($id);
            if (!$user) {
                throw new Exception("User not found");
            }

            // 1. Update Person using PersonService
            $personUpdateData = array_filter([
                'first_name' => $data['first_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'cuit' => $data['cuit'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'fiscal_condition_id' => $data['fiscal_condition_id'] ?? null,
                'person_type_id' => $data['person_type_id'] ?? null,
            ], fn($value) => !is_null($value));

            if (!empty($personUpdateData)) {
                // Ensure person exists before trying to update
                if ($user->person) {
                    $this->personService->updatePerson($user->person, $personUpdateData);
                } else {
                    // Handle case where user might not have a person record (shouldn't happen with current create logic)
                    Log::warning("Attempted to update person data for user ID {$id}, but no associated person found.");
                }
            }

            // 2. Update User specific data
            $userUpdateData = [];
            if (isset($data['email']))
                $userUpdateData['email'] = $data['email'];
            if (isset($data['username']))
                $userUpdateData['username'] = $data['username'];
            if (isset($data['role_id']))
                $userUpdateData['role_id'] = $data['role_id'];
            if (isset($data['active']))
                $userUpdateData['active'] = $data['active']; // Handle boolean

            // Handle password update separately
            if (!empty($data['password'])) {
                $userUpdateData['password'] = Hash::make($data['password']);
            }

            if (!empty($userUpdateData)) {
                $user->update($userUpdateData);
            }

            DB::commit();
            // Return the updated user with potentially updated person/role data
            return $user->fresh(['person', 'role']);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error updating user ID {$id}: " . $e->getMessage());
            throw new Exception("Failed to update user. " . $e->getMessage());
        }
    }

    /**
     * Delete a user (soft delete if enabled).
     * Consider if the associated Person should also be deleted.
     */
    public function deleteUser(int $id): bool
    {
        DB::beginTransaction();
        try {
            $user = $this->getUserById($id);
            if (!$user) {
                // Or throw Exception("User not found to delete");
                return false;
            }

            // Option 1: Only delete the user record
            $deleted = $user->delete();

            // Option 2: Delete user AND associated person (if desired)
            // if ($user->person) {
            //     $personDeleted = $this->personService->deletePerson($user->person);
            //     $deleted = $user->delete() && $personDeleted;
            // } else {
            //     $deleted = $user->delete();
            // }


            DB::commit();
            return $deleted;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error deleting user ID {$id}: " . $e->getMessage());
            throw new Exception("Failed to delete user. " . $e->getMessage());
        }
    }

    /**
     * Obtener todas las sucursales y las sucursales asignadas a un usuario
     */
    public function getUserBranches(int $userId): array
    {
        $user = User::with('branches')->findOrFail($userId);
        $allBranches = \App\Models\Branch::all();
        return [
            'branches' => $allBranches,
            'userBranches' => $user->branches->pluck('id'),
        ];
    }

    /**
     * Actualizar las sucursales asignadas a un usuario
     */
    public function updateUserBranches(int $userId, array $branchIds): void
    {
        $user = User::findOrFail($userId);
        $user->branches()->sync($branchIds);
    }

    public function checkUsernameExists($username): bool
    {
        return User::where('username', $username)->exists();
    }

    public function checkEmailExists($email): bool
    {
        return User::where('email', $email)->exists();
    }

    public function checkNameExists($firstName, $lastName): bool
    {
        return User::whereHas('person', function ($query) use ($firstName, $lastName) {
            $query->where('first_name', $firstName)
                ->where('last_name', $lastName);
        })->exists();
    }
}