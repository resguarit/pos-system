<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;

class GrantPermissionToRole extends Command
{
    protected $signature = 'role:grant-permission 
                            {role : Nombre del rol}
                            {permission : Nombre del permiso}';

    protected $description = 'Otorga un permiso específico a un rol';

    public function handle()
    {
        $roleName = $this->argument('role');
        $permissionName = $this->argument('permission');

        $role = Role::where('name', $roleName)->first();
        if (!$role) {
            $this->error("Rol '{$roleName}' no encontrado.");
            return 1;
        }

        $permission = Permission::where('name', $permissionName)->first();
        if (!$permission) {
            $this->error("Permiso '{$permissionName}' no encontrado.");
            return 1;
        }

        if ($role->permissions()->where('permission_id', $permission->id)->exists()) {
            $this->warn("El rol '{$roleName}' ya tiene el permiso '{$permissionName}'.");
            return 0;
        }

        $role->permissions()->attach($permission->id);

        $this->info("✓ Permiso '{$permissionName}' agregado al rol '{$roleName}'.");
        return 0;
    }
}
