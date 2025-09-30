<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Interfaces\PermissionServiceInterface;

class PermissionService implements PermissionServiceInterface
{
    public function getAllPermissions()
    {
        return Permission::all();
    }

    public function getPermissionsByRoleId($roleId)
    {
        $role = Role::with('permissions')->findOrFail($roleId);
        // Devuelve solo los permisos asociados a ese rol
        return $role->permissions;
    }

    public function setPermissionsForRole($roleId, array $permissionIds)
    {
        $role = Role::findOrFail($roleId);
        // Solo asigna permisos válidos existentes
        $validPermissionIds = Permission::whereIn('id', $permissionIds)->pluck('id')->toArray();
        $role->permissions()->sync($validPermissionIds);
        // Retorna los permisos actualizados del rol
        return $role->permissions;
    }

    public function countPermissionsByRole()
    {
        return Role::withCount('permissions')->get(['id', 'name', 'permissions_count']);
    }
}
