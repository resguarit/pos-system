<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Person;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log; // Importante para registrar información

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Asegurar que el rol Admin exista
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);

        // 2. Crear usuario administrador de sistema (oculto)
        $adminUser = User::where('email', 'admin@example.com')->first();

        if (!$adminUser) {
            // Crear persona asociada para el admin
            $adminPerson = Person::factory()->create([
                'first_name' => 'System',
                'last_name' => 'Administrator',
            ]);

            // Crear usuario administrador con campo hidden = true para no mostrarlo en listas
            $adminUser = User::create([
                'person_id' => $adminPerson->id,
                'email' => 'admin@example.com',
                'username' => 'admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'email_verified_at' => now(),
                'active' => 1,
                'hidden' => true, // Campo para ocultar de listas de usuarios
            ]);

        } else {
            // Asegurar que el admin existente esté marcado como oculto
            $adminUser->update(['hidden' => true]);
        }

        // 3. Asignar todas las sucursales al administrador
        $branches = Branch::all();
        if ($branches->isNotEmpty()) {
            $adminUser->branches()->sync($branches->pluck('id'));
        }

        // 4. Asignar todos los permisos al rol Admin
        $adminRoleId = $adminRole->id;
        $allPermissions = \App\Models\Permission::all();
        $adminRoleModel = Role::find($adminRoleId);
        if ($adminRoleModel && method_exists($adminRoleModel, 'permissions')) {
            $adminRoleModel->permissions()->sync($allPermissions->pluck('id'));
            
            if ($this->command) {
                $this->command->info("🔐 Asignados {$allPermissions->count()} permisos al rol Admin");
            }
        }
        
        // 5. Log de confirmación
        if ($this->command) {
            $this->command->info("✅ Usuario admin creado/actualizado: {$adminUser->email}");
            $this->command->info("✅ Rol asignado: {$adminRole->name}");
            $this->command->info("✅ Sucursales asignadas: {$branches->count()}");
        }
    }
}