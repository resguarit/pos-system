<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Support\Facades\DB;

class GrantAllPermissionsToAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:grant-all-permissions 
                            {--role=Admin : Nombre del rol admin (Admin o Administrador)}
                            {--assign-branches : También asignar todas las sucursales a usuarios admin}
                            {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Asigna todos los permisos disponibles al rol Admin (o Administrador)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $roleName = $this->option('role');
        $assignBranches = $this->option('assign-branches');
        $force = $this->option('force');

        // Buscar el rol admin (intentar ambos nombres)
        $adminRole = Role::where('name', $roleName)
            ->orWhere('name', 'Administrador')
            ->orWhere('name', 'admin')
            ->first();

        if (!$adminRole) {
            $this->error("❌ No se encontró ningún rol admin. Roles disponibles:");
            $roles = Role::all(['name']);
            foreach ($roles as $role) {
                $this->line("   - {$role->name}");
            }
            return 1;
        }

        $this->info("🔍 Rol encontrado: {$adminRole->name} (ID: {$adminRole->id})");

        // Obtener todos los permisos
        $allPermissions = Permission::all();

        if ($allPermissions->isEmpty()) {
            $this->error("❌ No hay permisos disponibles en el sistema.");
            $this->warn("💡 Ejecuta primero: php artisan db:seed --class=PermissionSeeder");
            return 1;
        }

        $currentPermissionsCount = $adminRole->permissions()->count();

        // Mostrar información antes de proceder
        $this->info("📊 Estado actual:");
        $this->info("   - Permisos totales en el sistema: {$allPermissions->count()}");
        $this->info("   - Permisos actuales del rol {$adminRole->name}: {$currentPermissionsCount}");
        $this->info("   - Permisos a asignar: {$allPermissions->count()}");

        // Contar usuarios con este rol
        $adminUsers = User::where('role_id', $adminRole->id)->get();
        $this->info("   - Usuarios con rol {$adminRole->name}: {$adminUsers->count()}");

        if (!$force) {
            if (!$this->confirm("¿Deseas asignar todos los permisos al rol '{$adminRole->name}'?")) {
                $this->info('Operación cancelada.');
                return 0;
            }
        }

        try {
            DB::beginTransaction();

            $this->info("🔄 Asignando permisos...");

            // Asignar todos los permisos al rol Admin
            $adminRole->permissions()->sync($allPermissions->pluck('id'));

            $this->info("✅ Permisos asignados exitosamente!");

            // Asignar sucursales si se solicita
            if ($assignBranches) {
                $allBranches = Branch::all();
                if ($allBranches->isNotEmpty()) {
                    $this->info("🔄 Asignando sucursales a usuarios admin...");
                    foreach ($adminUsers as $adminUser) {
                        $adminUser->branches()->sync($allBranches->pluck('id'));
                    }
                    $this->info("✅ {$allBranches->count()} sucursales asignadas a {$adminUsers->count()} usuario(s) admin");
                } else {
                    $this->warn("⚠️ No hay sucursales disponibles para asignar");
                }
            }

            DB::commit();

            // Mostrar resumen final
            $this->newLine();
            $this->info("📋 Resumen de la operación:");
            $this->info("   ✅ Rol: {$adminRole->name}");
            $this->info("   ✅ Permisos asignados: {$allPermissions->count()}");
            $this->info("   ✅ Usuarios afectados: {$adminUsers->count()}");

            if ($assignBranches) {
                $branchesCount = Branch::count();
                $this->info("   ✅ Sucursales asignadas: {$branchesCount}");
            }

            // Mostrar algunos permisos como ejemplo
            $this->newLine();
            $this->info("📝 Ejemplos de permisos asignados:");
            $samplePermissions = $allPermissions->take(10);
            foreach ($samplePermissions as $permission) {
                $this->line("   - {$permission->name}: {$permission->description}");
            }
            if ($allPermissions->count() > 10) {
                $this->line("   ... y " . ($allPermissions->count() - 10) . " más");
            }

            // Verificar si hay permisos nuevos (como ver_auditorias)
            $newPermissions = $allPermissions->filter(function ($permission) use ($adminRole) {
                return !$adminRole->permissions()->where('permissions.id', $permission->id)->exists();
            });

            if ($newPermissions->count() > 0) {
                $this->newLine();
                $this->info("✨ Permisos nuevos asignados:");
                foreach ($newPermissions as $permission) {
                    $this->line("   + {$permission->name}");
                }
            }

            $this->newLine();
            $this->info("🎉 ¡Operación completada exitosamente!");

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error al asignar permisos: " . $e->getMessage());
            $this->error("   " . $e->getTraceAsString());
            return 1;
        }
    }
}

