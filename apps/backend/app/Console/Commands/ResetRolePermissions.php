<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

class ResetRolePermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:reset-role {role : Nombre del rol a resetear} {--force : Forzar reset sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Resetea los permisos de un rol específico a sus valores predeterminados del seeder';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $roleName = $this->argument('role');
        $role = Role::where('name', $roleName)->first();

        if (!$role) {
            $this->error("❌ Rol '{$roleName}' no encontrado.");
            return 1;
        }

        $currentPermissions = $role->permissions->count();
        
        if (!$this->option('force')) {
            if (!$this->confirm("¿Estás seguro de que quieres resetear los permisos del rol '{$roleName}'? Actualmente tiene {$currentPermissions} permisos.")) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        $this->info("🔄 Reseteando permisos para el rol '{$roleName}'...");

        try {
            DB::beginTransaction();

            // Obtener permisos predeterminados
            $defaultPermissions = $this->getDefaultPermissionsForRole($roleName);
            
            if (empty($defaultPermissions)) {
                $this->error("❌ No se encontraron permisos predeterminados para el rol '{$roleName}'.");
                return 1;
            }

            // Aplicar permisos predeterminados
            $permissions = Permission::whereIn('name', $defaultPermissions)->get();
            $role->permissions()->sync($permissions->pluck('id'));

            DB::commit();

            $this->info("✅ Permisos reseteados exitosamente para '{$roleName}'");
            $this->info("📊 Nuevos permisos: " . $permissions->count());

            // Mostrar permisos asignados
            $this->info("📋 Permisos asignados:");
            foreach ($permissions as $permission) {
                $this->info("   - {$permission->name}: {$permission->description}");
            }

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Error al resetear permisos: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Obtiene los permisos predeterminados para un rol específico.
     */
    private function getDefaultPermissionsForRole(string $roleName): array
    {
        $defaultRolePermissions = [
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

        return $defaultRolePermissions[$roleName] ?? [];
    }
}
