<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Dashboard
            ['name' => 'ver_dashboard', 'description' => 'Ver panel principal', 'module' => 'dashboard'],
            ['name' => 'ver_estadisticas', 'description' => 'Ver estadísticas del sistema', 'module' => 'dashboard'],
            
            // Ventas
            ['name' => 'ver_ventas', 'description' => 'Ver listado de ventas', 'module' => 'ventas'],
            ['name' => 'crear_ventas', 'description' => 'Registrar nueva venta', 'module' => 'ventas'],
            ['name' => 'anular_ventas', 'description' => 'Anular venta', 'module' => 'ventas'],
            ['name' => 'reimprimir_comprobantes', 'description' => 'Reimprimir comprobantes', 'module' => 'ventas'],
            ['name' => 'aplicar_descuentos', 'description' => 'Aplicar descuentos en ventas', 'module' => 'ventas'],
            
            // Productos
            ['name' => 'ver_productos', 'description' => 'Ver productos', 'module' => 'productos'],
            ['name' => 'crear_productos', 'description' => 'Crear producto', 'module' => 'productos'],
            ['name' => 'editar_productos', 'description' => 'Editar producto', 'module' => 'productos'],
            ['name' => 'eliminar_productos', 'description' => 'Eliminar producto', 'module' => 'productos'],
            ['name' => 'actualizar_stock', 'description' => 'Actualizar stock de productos', 'module' => 'productos'],
            
            // Combos
            ['name' => 'gestionar_combos', 'description' => 'Gestionar combos de productos', 'module' => 'combos'],
            ['name' => 'crear_combos', 'description' => 'Crear nuevo combo', 'module' => 'combos'],
            ['name' => 'editar_combos', 'description' => 'Editar combo existente', 'module' => 'combos'],
            ['name' => 'eliminar_combos', 'description' => 'Eliminar combo', 'module' => 'combos'],
            
            // Categorías
            ['name' => 'ver_categorias', 'description' => 'Ver categorías', 'module' => 'categorias'],
            ['name' => 'crear_categorias', 'description' => 'Crear categoría', 'module' => 'categorias'],
            ['name' => 'editar_categorias', 'description' => 'Editar categoría', 'module' => 'categorias'],
            ['name' => 'eliminar_categorias', 'description' => 'Eliminar categoría', 'module' => 'categorias'],
            
            // Stock e Inventario
            ['name' => 'ver_stock', 'description' => 'Ver niveles de stock', 'module' => 'inventario'],
            ['name' => 'ajustar_stock', 'description' => 'Realizar ajustes de stock', 'module' => 'inventario'],
            ['name' => 'ver_alertas_stock', 'description' => 'Ver alertas de stock bajo', 'module' => 'inventario'],
            ['name' => 'realizar_inventario', 'description' => 'Realizar toma de inventario', 'module' => 'inventario'],
            
            // Usuarios
            ['name' => 'ver_usuarios', 'description' => 'Ver usuarios', 'module' => 'usuarios'],
            ['name' => 'crear_usuarios', 'description' => 'Crear usuario', 'module' => 'usuarios'],
            ['name' => 'editar_usuarios', 'description' => 'Editar usuario', 'module' => 'usuarios'],
            ['name' => 'eliminar_usuarios', 'description' => 'Eliminar usuario', 'module' => 'usuarios'],
            ['name' => 'ver_ventas_usuario', 'description' => 'Ver historial de ventas por usuario', 'module' => 'usuarios'],
            ['name' => 'ver_estadisticas_usuario', 'description' => 'Ver estadísticas de ventas por usuario', 'module' => 'usuarios'],
            
            // Roles y Permisos
            ['name' => 'ver_roles', 'description' => 'Ver roles', 'module' => 'roles'],
            ['name' => 'crear_roles', 'description' => 'Crear rol', 'module' => 'roles'],
            ['name' => 'editar_roles', 'description' => 'Editar rol', 'module' => 'roles'],
            ['name' => 'eliminar_roles', 'description' => 'Eliminar rol', 'module' => 'roles'],
            ['name' => 'ver_permisos', 'description' => 'Ver permisos del sistema', 'module' => 'roles'],
            ['name' => 'asignar_permisos', 'description' => 'Asignar permisos a roles', 'module' => 'roles'],
            
            ['name' => 'cambiar_password', 'description' => 'Cambiar contraseña de usuario', 'module' => 'perfil'],
            // Sucursales
            ['name' => 'ver_sucursales', 'description' => 'Ver sucursales', 'module' => 'sucursales'],
            ['name' => 'crear_sucursales', 'description' => 'Crear sucursal', 'module' => 'sucursales'],
            ['name' => 'editar_sucursales', 'description' => 'Editar sucursal', 'module' => 'sucursales'],
            ['name' => 'eliminar_sucursales', 'description' => 'Eliminar sucursal', 'module' => 'sucursales'],
            ['name' => 'ver_personal_sucursal', 'description' => 'Ver personal de sucursales', 'module' => 'sucursales'],
            ['name' => 'ver_historial_ventas_sucursal', 'description' => 'Ver historial de ventas de sucursal', 'module' => 'sucursales'],
            
            // Clientes
            ['name' => 'ver_clientes', 'description' => 'Ver clientes', 'module' => 'clientes'],
            ['name' => 'crear_clientes', 'description' => 'Crear cliente', 'module' => 'clientes'],
            ['name' => 'editar_clientes', 'description' => 'Editar cliente', 'module' => 'clientes'],
            ['name' => 'eliminar_clientes', 'description' => 'Eliminar cliente', 'module' => 'clientes'],
            
            // Órdenes de Compra
            ['name' => 'ver_ordenes_compra', 'description' => 'Ver órdenes de compra e historial', 'module' => 'compras'],
            ['name' => 'crear_ordenes_compra', 'description' => 'Crear orden de compra', 'module' => 'compras'],
            ['name' => 'editar_ordenes_compra', 'description' => 'Editar orden de compra', 'module' => 'compras'],
            ['name' => 'cancelar_ordenes_compra', 'description' => 'Cancelar orden de compra', 'module' => 'compras'],
            ['name' => 'completar_ordenes_compra', 'description' => 'Completar/finalizar orden de compra', 'module' => 'compras'],
            
            // Proveedores
            ['name' => 'ver_proveedores', 'description' => 'Ver proveedores', 'module' => 'proveedores'],
            ['name' => 'crear_proveedores', 'description' => 'Crear proveedor', 'module' => 'proveedores'],
            ['name' => 'editar_proveedores', 'description' => 'Editar proveedor', 'module' => 'proveedores'],
            ['name' => 'eliminar_proveedores', 'description' => 'Eliminar proveedor', 'module' => 'proveedores'],
            
            // Caja y Movimientos
            ['name' => 'abrir_cerrar_caja', 'description' => 'Abrir o cerrar caja registradora', 'module' => 'caja'],
            ['name' => 'ver_movimientos_caja', 'description' => 'Ver la tabla de movimientos de caja', 'module' => 'caja'],
            ['name' => 'crear_movimientos_caja', 'description' => 'Crear nuevo movimiento de caja', 'module' => 'caja'],
            ['name' => 'eliminar_movimientos_caja', 'description' => 'Eliminar movimientos de caja', 'module' => 'caja'],
            ['name' => 'ver_historico_caja', 'description' => 'Ver histórico y reportes de caja', 'module' => 'caja'],
            
            // Reportes
            ['name' => 'ver_reportes', 'description' => 'Ver reportes', 'module' => 'reportes'],
            ['name' => 'generar_reportes', 'description' => 'Generar reportes personalizados', 'module' => 'reportes'],
            ['name' => 'exportar_reportes', 'description' => 'Exportar reportes', 'module' => 'reportes'],
            // ['name' => 'programar_reportes', 'description' => 'Programar reportes automáticos', 'module' => 'reportes'],
            
            // // IVA y Fiscal
            // ['name' => 'ver_iva', 'description' => 'Ver condiciones de IVA', 'module' => 'fiscal'],
            // ['name' => 'editar_iva', 'description' => 'Editar condiciones de IVA', 'module' => 'fiscal'],
            // ['name' => 'ver_tipos_comprobante', 'description' => 'Ver tipos de comprobante', 'module' => 'fiscal'],
            // ['name' => 'editar_tipos_comprobante', 'description' => 'Editar tipos de comprobante', 'module' => 'fiscal'],
            
            // Configuración del Sistema
            ['name' => 'ver_configuracion_sistema', 'description' => 'Ver configuración del sistema', 'module' => 'configuracion'],
            ['name' => 'editar_configuracion_sistema', 'description' => 'Editar configuración del sistema (logo, título, empresa, etc.)', 'module' => 'configuracion'],
            
            // // Auditoria
            // ['name' => 'ver_auditoria', 'description' => 'Ver registros de auditoría', 'module' => 'auditoria'],
            // ['name' => 'exportar_auditoria', 'description' => 'Exportar registros de auditoría', 'module' => 'auditoria'],
            // // // Reparaciones
            ['name' => 'ver_reparaciones', 'description' => 'Ver listado de reparaciones', 'module' => 'reparaciones'],
            ['name' => 'crear_reparaciones', 'description' => 'Registrar nueva reparación', 'module' => 'reparaciones'],
            ['name' => 'editar_reparaciones', 'description' => 'Editar reparación existente', 'module' => 'reparaciones'],
            ['name' => 'eliminar_reparaciones', 'description' => 'Eliminar reparación', 'module' => 'reparaciones'],
            // ['name' => 'asignar_tecnico_reparaciones', 'description' => 'Asignar técnico a reparación', 'module' => 'reparaciones'],
            // ['name' => 'cambiar_estado_reparaciones', 'description' => 'Cambiar estado de reparación', 'module' => 'reparaciones'],
            // ['name' => 'vincular_venta_reparaciones', 'description' => 'Vincular venta a reparación', 'module' => 'reparaciones'],
            // ['name' => 'exportar_reparaciones', 'description' => 'Exportar listado de reparaciones', 'module' => 'reparaciones'],
            // ['name' => 'importar_reparaciones', 'description' => 'Importar reparaciones masivamente', 'module' => 'reparaciones'],
            // // // Turnos
            ['name' => 'ver_turnos', 'description' => 'Ver turnos', 'module' => 'turnos'],
            ['name' => 'crear_turnos', 'description' => 'Crear turno', 'module' => 'turnos'],
            ['name' => 'editar_turnos', 'description' => 'Editar turno', 'module' => 'turnos'],
            ['name' => 'eliminar_turnos', 'description' => 'Eliminar turno', 'module' => 'turnos'],
            // // Zonas de entrega
            // ['name' => 'ver_zonas_entrega', 'description' => 'Ver zonas de entrega', 'module' => 'zonas_entrega'],
            // ['name' => 'crear_zonas_entrega', 'description' => 'Crear zona de entrega', 'module' => 'zonas_entrega'],
            // ['name' => 'editar_zonas_entrega', 'description' => 'Editar zona de entrega', 'module' => 'zonas_entrega'],
            // ['name' => 'eliminar_zonas_entrega', 'description' => 'Eliminar zona de entrega', 'module' => 'zonas_entrega'],
            // // Solicitudes
            // ['name' => 'ver_solicitudes', 'description' => 'Ver solicitudes', 'module' => 'solicitudes'],
            // ['name' => 'crear_solicitudes', 'description' => 'Crear solicitud', 'module' => 'solicitudes'],
            // ['name' => 'editar_solicitudes', 'description' => 'Editar solicitud', 'module' => 'solicitudes'],
            // ['name' => 'eliminar_solicitudes', 'description' => 'Eliminar solicitud', 'module' => 'solicitudes'],
            
            // Cuentas Corrientes - Permiso unificado
            ['name' => 'gestionar_cuentas_corrientes', 'description' => 'Gestionar cuentas corrientes (Ver, crear, editar, procesar pagos, etc.)', 'module' => 'cuentas_corrientes'],
            
            // Permisos adicionales identificados en la aplicación
            ['name' => 'exportar_lista_precios', 'description' => 'Exportar lista de precios', 'module' => 'productos'],
            ['name' => 'actualizar_precios_masivo', 'description' => 'Actualizar precios masivamente', 'module' => 'productos'],
        ];
        foreach ($permissions as $permission) {
            Permission::updateOrCreate(['name' => $permission['name']], $permission);
        }
    }
}
