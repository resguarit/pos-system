<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Branch;

class AdminPermissionsSeeder extends Seeder
{
    /**
     * Asegurar que el usuario admin tenga todos los permisos
     */
    public function run(): void
    {
        // Buscar el usuario admin
        $adminUser = User::where('email', 'admin@example.com')->first();

        if (!$adminUser) {
            if ($this->command) {
                $this->command->warn("⚠️  Usuario admin no encontrado. Ejecute UserSeeder primero.");
            }
            return;
        }

        // Buscar o crear el rol Admin
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);

        // Asignar el rol Admin al usuario admin
        $adminUser->update(['role_id' => $adminRole->id]);

        // Permisos que NO debe tener el Admin
        $excludedPermissions = [
            'solo_crear_presupuestos', // Este permiso es solo para usuarios que NO pueden facturar
        ];

        // Obtener todos los permisos EXCEPTO los excluidos
        $allPermissions = Permission::whereNotIn('name', $excludedPermissions)->get();

        if ($allPermissions->isEmpty()) {
            if ($this->command) {
                $this->command->warn("⚠️  No hay permisos disponibles. Ejecute PermissionSeeder primero.");
            }
            return;
        }

        // Asignar todos los permisos (menos los excluidos) al rol Admin
        $adminRole->permissions()->sync($allPermissions->pluck('id'));

        // Asignar todas las sucursales al admin
        $allBranches = Branch::all();
        if ($allBranches->isNotEmpty()) {
            $adminUser->branches()->sync($allBranches->pluck('id'));
        }

        // Log de confirmación
        if ($this->command) {
            $this->command->info("🔐 AdminPermissionsSeeder ejecutado exitosamente:");
            $this->command->info("   ✅ Usuario: {$adminUser->email}");
            $this->command->info("   ✅ Rol: {$adminRole->name}");
            $this->command->info("   ✅ Permisos asignados: {$allPermissions->count()}");
            $this->command->info("   ✅ Sucursales asignadas: {$allBranches->count()}");
        }
    }
}
