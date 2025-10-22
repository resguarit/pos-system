<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class PermissionRoleSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Role::where('name', 'Admin')->first();
        $cajero = Role::where('name', 'Cajero')->first();
        $supervisor = Role::where('name', 'Supervisor')->first();

        // Admin: Todos los permisos
        if ($admin) {
            $allPermissions = Permission::all();
            $admin->permissions()->sync($allPermissions->pluck('id'));
        }

        // Cajero: Permisos de ventas, POS, caja y perfil
        if ($cajero) {
            $cajeroPermissions = Permission::whereIn('name', [
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
            ])->get();
            $cajero->permissions()->sync($cajeroPermissions->pluck('id'));
        }

        // Supervisor: Permisos de productos, inventario, compras y reportes
        if ($supervisor) {
            $supervisorPermissions = Permission::whereIn('name', [
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
                'ver_reportes',
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
                // Permisos de combos
                'gestionar_combos',
                'crear_combos',
                'editar_combos',
                'eliminar_combos',
                // Permisos de usuarios y ventas por usuario
                'ver_usuarios',
                'crear_usuarios',
                'editar_usuarios',
                'eliminar_usuarios',
                'ver_ventas_usuario',
                'ver_estadisticas_usuario'
            ])->get();
            $supervisor->permissions()->sync($supervisorPermissions->pluck('id'));
        }
    }
}
