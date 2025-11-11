<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class PermissionRoleSeeder extends Seeder
{
    /**
     * Asigna todos los permisos solo al rol Admin.
     * Los demás roles deben configurarse manualmente desde la interfaz.
     */
    public function run(): void
    {
        $admin = Role::where('name', 'Admin')->first();

        // Solo Admin: Todos los permisos
        if ($admin) {
            $allPermissions = Permission::all();
            $admin->permissions()->sync($allPermissions->pluck('id'));
        }
    }
}
