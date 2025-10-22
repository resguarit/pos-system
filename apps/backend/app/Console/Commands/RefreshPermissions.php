<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class RefreshPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:refresh {--force : Force refresh without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Refresh permissions table intelligently: add new permissions, remove obsolete ones, preserve user-permission relationships';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres refrescar los permisos? Esto agregará nuevos permisos y eliminará obsoletos, pero preservará los permisos en uso por usuarios activos.')) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        $this->info('🔄 Refrescando permisos de manera inteligente...');

        try {
            DB::beginTransaction();

            // 1. Obtener permisos actuales y sus relaciones con roles
            $this->info('📊 Analizando permisos existentes...');
            $existingPermissions = Permission::with('roles')->get();
            $existingPermissionNames = $existingPermissions->pluck('name')->toArray();
            
            // Obtener permisos que están asignados a roles (que a su vez pueden estar asignados a usuarios)
            $permissionsWithRoles = $existingPermissions->filter(function ($permission) {
                return $permission->roles->count() > 0;
            })->pluck('name')->toArray();
            
            // Obtener permisos que están siendo utilizados por usuarios a través de roles
            $permissionsInUse = DB::table('permission_role')
                ->join('users', 'users.role_id', '=', 'permission_role.role_id')
                ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
                ->where('users.active', true)
                ->distinct()
                ->pluck('permissions.name')
                ->toArray();
            
            $this->info("   - Permisos existentes: " . count($existingPermissionNames));
            $this->info("   - Permisos asignados a roles: " . count($permissionsWithRoles));
            $this->info("   - Permisos en uso por usuarios activos: " . count($permissionsInUse));

            // 2. Ejecutar el seeder de permisos para obtener la lista actualizada
            $this->info('🌱 Ejecutando seeder de permisos...');
            $this->call('db:seed', ['--class' => 'PermissionSeeder']);
            
            // 3. Obtener permisos después del seeder
            $updatedPermissions = Permission::all();
            $updatedPermissionNames = $updatedPermissions->pluck('name')->toArray();
            
            // 4. Identificar cambios
            $newPermissions = array_diff($updatedPermissionNames, $existingPermissionNames);
            $obsoletePermissions = array_diff($existingPermissionNames, $updatedPermissionNames);
            
            $this->info('📈 Cambios detectados:');
            $this->info('   - Nuevos permisos: ' . count($newPermissions));
            $this->info('   - Permisos obsoletos: ' . count($obsoletePermissions));
            
            // 5. Mostrar nuevos permisos
            if (!empty($newPermissions)) {
                $this->info('✨ Nuevos permisos agregados:');
                foreach ($newPermissions as $permission) {
                    $this->info("   + {$permission}");
                }
            }
            
            // 6. Eliminar permisos obsoletos (solo los que NO están en uso por usuarios activos)
            $obsoletePermissionsToRemove = [];
            $obsoletePermissionsToKeep = [];
            
            foreach ($obsoletePermissions as $permissionName) {
                if (in_array($permissionName, $permissionsInUse)) {
                    $obsoletePermissionsToKeep[] = $permissionName;
                    $this->warn("⚠️  Permiso obsoleto '{$permissionName}' mantenido porque está en uso por usuarios activos");
                } else {
                    $obsoletePermissionsToRemove[] = $permissionName;
                }
            }
            
            if (!empty($obsoletePermissionsToRemove)) {
                $this->info('🗑️ Eliminando permisos obsoletos no utilizados:');
                foreach ($obsoletePermissionsToRemove as $permissionName) {
                    $this->info("   - {$permissionName}");
                }
                
                Permission::whereIn('name', $obsoletePermissionsToRemove)->delete();
            }
            
            // 7. Actualizar asignaciones de roles-permisos
            $this->info('🔗 Actualizando asignaciones de roles-permisos...');
            $this->call('db:seed', ['--class' => 'PermissionRoleSeeder']);
            
            DB::commit();
            
            $this->info('✅ Permisos refrescados exitosamente!');
            $this->info('📊 Estadísticas finales:');
            $this->info('   - Permisos totales: ' . Permission::count());
            $this->info('   - Relaciones role-permission: ' . DB::table('permission_role')->count());
            $this->info('   - Usuarios activos con roles: ' . DB::table('users')->where('active', true)->count());
            
            // Mostrar permisos por rol
            $this->info('📋 Permisos por rol:');
            $roles = Role::with('permissions')->get();
            foreach ($roles as $role) {
                $this->info("   - {$role->name}: " . $role->permissions->count() . " permisos");
            }
            
            // Resumen de cambios
            if (!empty($newPermissions) || !empty($obsoletePermissionsToRemove)) {
                $this->info('📝 Resumen de cambios:');
                if (!empty($newPermissions)) {
                    $this->info("   ✅ Agregados: " . count($newPermissions) . " permisos");
                }
                if (!empty($obsoletePermissionsToRemove)) {
                    $this->info("   🗑️ Eliminados: " . count($obsoletePermissionsToRemove) . " permisos");
                }
                if (!empty($obsoletePermissionsToKeep)) {
                    $this->info("   ⚠️ Mantenidos: " . count($obsoletePermissionsToKeep) . " permisos obsoletos (en uso por usuarios activos)");
                }
            } else {
                $this->info('ℹ️ No se detectaron cambios en los permisos.');
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Error al refrescar permisos: ' . $e->getMessage());
            return 1;
        }
    }
}
