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
    protected $description = 'Refresh permissions table: add new permissions, remove obsolete ones. NO modifica permisos asignados a roles existentes.';

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

            // 2. Ejecutar los seeders de permisos para obtener la lista actualizada
            $this->info('🌱 Ejecutando seeders de permisos...');
            $this->call('db:seed', ['--class' => 'PermissionSeeder']);
            $this->call('db:seed', ['--class' => 'ShipmentPermissionSeeder']);
            
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
            
            // 7. Actualizar asignaciones de roles-permisos (DESHABILITADO para preservar permisos existentes)
            // Comentado para evitar que el comando sobrescriba permisos personalizados de roles
            // $this->info('🔗 Actualizando asignaciones de roles-permisos...');
            // $this->updateRolePermissionsIntelligently();
            $this->info('⚠️ Asignaciones de roles-permisos NO modificadas para preservar configuración existente');
            
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

    /**
     * Actualiza las asignaciones de permisos a roles de manera inteligente,
     * preservando los permisos manuales y solo aplicando los del seeder
     * para roles que no han sido modificados manualmente.
     */
    private function updateRolePermissionsIntelligently()
    {
        // Obtener los permisos predeterminados del seeder
        $defaultRolePermissions = $this->getDefaultRolePermissions();
        
        foreach ($defaultRolePermissions as $roleName => $permissionNames) {
            $role = Role::where('name', $roleName)->first();
            
            if (!$role) {
                $this->warn("⚠️ Rol '{$roleName}' no encontrado, saltando...");
                continue;
            }
            
            // Verificar si el rol tiene permisos personalizados
            $currentPermissions = $role->permissions->pluck('name')->toArray();
            $defaultPermissions = $permissionNames;
            
            // Si el rol tiene más permisos que los predeterminados, asumimos que fue modificado manualmente
            $hasCustomPermissions = count($currentPermissions) > count($defaultPermissions) || 
                                  !empty(array_diff($currentPermissions, $defaultPermissions));
            
            if ($hasCustomPermissions) {
                $this->info("🔒 Preservando permisos personalizados para rol '{$roleName}' ({$role->permissions->count()} permisos)");
                continue;
            }
            
            // Si el rol tiene exactamente los permisos predeterminados o menos, aplicar los del seeder
            $this->info("🔄 Aplicando permisos predeterminados para rol '{$roleName}'");
            $permissions = Permission::whereIn('name', $permissionNames)->get();
            $role->permissions()->sync($permissions->pluck('id'));
            
            $this->info("   ✅ {$roleName}: " . $permissions->count() . " permisos asignados");
        }
    }

    /**
     * Obtiene los permisos predeterminados para cada rol según el seeder.
     */
    private function getDefaultRolePermissions(): array
    {
        return [
            'Admin' => Permission::all()->pluck('name')->toArray(),
            
            'Cajero' => [
                'ver_dashboard',
                'ver_ventas',
                'crear_ventas',
                'reimprimir_comprobantes',
                'aplicar_descuentos',
                'abrir_cerrar_caja',
                'ver_movimientos_caja',
                'crear_movimientos_caja',
                'eliminar_movimientos_caja',
                'ver_historico_caja',
                'ver_clientes',
                'crear_clientes',
                'editar_clientes',
                'ver_productos',
                'ver_stock',
                'cambiar_password'
            ],
            
            'Supervisor' => [
                'ver_dashboard',
                'ver_estadisticas',
                'ver_productos',
                'crear_productos',
                'editar_productos',
                'eliminar_productos',
                'actualizar_stock',
                'ver_stock',
                'exportar_lista_precios',
                'actualizar_precios_masivo',
                'ver_categorias',
                'crear_categorias',
                'editar_categorias',
                'eliminar_categorias',
                'ver_proveedores',
                'crear_proveedores',
                'editar_proveedores',
                'eliminar_proveedores',
                'ver_ordenes_compra',
                'crear_ordenes_compra',
                'editar_ordenes_compra',
                'eliminar_ordenes_compra',
                'ver_historial_compras',
                'generar_reportes',
                'exportar_reportes',
                'ver_ventas',
                'anular_ventas',
                'reimprimir_comprobantes',
                'ver_clientes',
                'crear_clientes',
                'editar_clientes',
                'ver_reparaciones',
                'crear_reparaciones',
                'editar_reparaciones',
                'repairs.create',
                'repairs.view',
                'repairs.edit',
                'repairs.link_sale',
                'ver_turnos',
                'crear_turnos',
                'editar_turnos',
                'appointments.create',
                'ver_sucursales',
                'ver_personal_sucursal',
                'ver_historial_ventas_sucursal',
                'ajustar_stock',
                'ver_alertas_stock',
                'realizar_inventario',
                'abrir_cerrar_caja',
                'ver_movimientos_caja',
                'crear_movimientos_caja',
                'eliminar_movimientos_caja',
                'ver_historico_caja',
                'cambiar_password',
                'gestionar_combos',
                'crear_combos',
                'editar_combos',
                'eliminar_combos',
                'ver_usuarios',
                'crear_usuarios',
                'editar_usuarios',
                'eliminar_usuarios',
                'ver_ventas_usuario',
                'ver_estadisticas_usuario'
            ]
        ];
    }
}
