<?php
namespace App\Services;

use App\Interfaces\RoleServiceInterface;
use App\Models\Role;

class RoleService implements RoleServiceInterface
{
    public function getAllRoles()
    {
        return Role::all();
    }

    public function getRoleById($id)
    {
        return Role::findOrFail($id);
    }

    public function createRole(array $data)
    {
        return Role::create($data);
    }

    public function updateRole($id, array $data)
    {
        $role = Role::findOrFail($id);
        $role->update($data);
        return $role;
    }

    public function deleteRole($id)
    {
        $role = Role::findOrFail($id);
        return $role->delete();
    }

    public function checkNameExists($name): bool
    {
        return Role::where('name', $name)->exists();
    }
}
