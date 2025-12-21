<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class PermissionRoleSeeder extends Seeder
{
    /**
     * Asigna todos los permisos al rol Admin, excepto los permisos que no debe tener.
     * Los demás roles deben configurarse manualmente desde la interfaz.
     */
    public function run(): void
    {
        // Buscar el rol Admin (puede estar como 'Admin' o 'Administrador')
        $admin = Role::whereIn('name', ['Admin', 'Administrador'])->first();

        if ($admin) {
            // Permisos que NO debe tener el Admin
            $excludedPermissions = [
                'solo_crear_presupuestos', // Este permiso es solo para usuarios que NO pueden facturar
            ];

            // Obtener todos los permisos EXCEPTO los excluidos
            $permissions = Permission::whereNotIn('name', $excludedPermissions)->get();

            $admin->permissions()->sync($permissions->pluck('id'));
        }
    }
}
