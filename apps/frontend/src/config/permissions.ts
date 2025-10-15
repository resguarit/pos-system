// Configuración completa de permisos por módulo/feature
import { FEATURES } from './features';

export const PERMISSIONS_CONFIG = {
  // Dashboard
  dashboard: {
    feature: 'dashboard',
    permissions: ['ver_dashboard']
  },
  
  // Inventario/Productos
  inventario: {
    feature: 'inventario',
    permissions: [
      'ver_productos',
      'ver_stock',
      'crear_productos',
      'editar_productos',
      'eliminar_productos',
      'ajustar_stock',
      'ver_movimientos_stock'
    ]
  },
  
  // Categorías
  categorias: {
    feature: 'categorias',
    permissions: [
      'ver_categorias',
      'crear_categorias',
      'editar_categorias',
      'eliminar_categorias'
    ]
  },
  
  // Ventas
  ventas: {
    feature: 'ventas',
    permissions: [
      'ver_ventas',
      'crear_ventas',
      'editar_ventas',
      'anular_ventas',
      'reimprimir_comprobantes',
      'aplicar_descuentos'
    ]
  },
  
  // POS (Punto de Venta)
  pos: {
    feature: 'pos',
    permissions: [
      'crear_ventas',
      'ver_productos',
      'ver_stock',
      'ver_clientes',
      'crear_clientes',
      'ver_tipos_comprobante'
    ]
  },
  
  // Historial de Ventas
  historialVentas: {
    feature: 'historialVentas',
    permissions: [
      'ver_ventas',
      'reimprimir_comprobantes',
      'exportar_reportes'
    ]
  },
  
  // Caja
  caja: {
    feature: 'caja',
    permissions: [
      'abrir_cerrar_caja',
      'ver_movimientos_caja',
      'crear_movimientos_caja',
      'eliminar_movimientos_caja',
      'ver_historico_caja'
    ]
  },
  
  // Clientes
  clientes: {
    feature: 'clientes',
    permissions: [
      'ver_clientes',
      'crear_clientes',
      'editar_clientes',
      'eliminar_clientes',
      'ver_historial_cliente',
      'ver_cuentas_corrientes'
    ]
  },
  
  // Proveedores
  proveedores: {
    feature: 'proveedores',
    permissions: [
      'ver_proveedores',
      'crear_proveedores',
      'editar_proveedores',
      'eliminar_proveedores'
    ]
  },
  
  // Órdenes de Compra
  purchaseOrders: {
    feature: 'purchaseOrders',
    permissions: [
      'ver_ordenes_compra',
      'crear_ordenes_compra',
      'editar_ordenes_compra',
      'cancelar_ordenes_compra',
      'completar_ordenes_compra'
    ]
  },
  
  // Sucursales
  sucursales: {
    feature: 'sucursales',
    permissions: [
      'ver_sucursales',
      'crear_sucursales',
      'editar_sucursales',
      'eliminar_sucursales',
      'ver_ventas_sucursal'
    ]
  },
  
  // Usuarios
  usuarios: {
    feature: 'usuarios',
    permissions: [
      'ver_usuarios',
      'crear_usuarios',
      'editar_usuarios',
      'eliminar_usuarios',
      'cambiar_password_usuario',
      'activar_desactivar_usuario'
    ]
  },
  
  // Roles
  roles: {
    feature: 'roles',
    permissions: [
      'ver_roles',
      'crear_roles',
      'editar_roles',
      'eliminar_roles',
      'asignar_permisos'
    ]
  },
  
  // Configuración del Sistema
  configuracionSistema: {
    feature: 'configuracionSistema',
    permissions: [
      'ver_configuracion',
      'editar_configuracion',
      'ver_auditoria',
      'ver_logs_sistema',
      'gestionar_backup'
    ]
  },
  
  // Reparaciones (feature deshabilitada)
  repairs: {
    feature: 'repairs',
    permissions: [
      'ver_reparaciones',
      'crear_reparaciones',
      'editar_reparaciones',
      'eliminar_reparaciones',
      'vincular_venta_reparaciones'
    ]
  },
  
  // Turnos (feature deshabilitada)
  turnos: {
    feature: 'turnos',
    permissions: [
      'ver_turnos',
      'crear_turnos',
      'editar_turnos',
      'eliminar_turnos'
    ]
  },
  
  // Análisis de Ventas (feature deshabilitada)
  analisisVentas: {
    feature: 'analisisVentas',
    permissions: [
      'ver_estadisticas',
      'generar_reportes_ventas',
      'ver_graficos_ventas',
      'exportar_estadisticas'
    ]
  },
  
  // Reportes de Inventario (feature deshabilitada)
  reportesInventario: {
    feature: 'reportesInventario',
    permissions: [
      'generar_reportes',
      'ver_stock_bajo',
      'ver_productos_mas_vendidos',
      'exportar_reportes_inventario'
    ]
  },
  
  // Facturación (feature deshabilitada)
  facturacion: {
    feature: 'facturacion',
    permissions: [
      'ver_ventas',
      'crear_comprobantes',
      'editar_comprobantes',
      'eliminar_comprobantes',
      'enviar_comprobantes',
      'imprimir_comprobantes'
    ]
  },
  
  // Zonas de Entrega (feature deshabilitada)
  zonasEntrega: {
    feature: 'zonasEntrega',
    permissions: [
      'ver_zonas_entrega',
      'crear_zonas_entrega',
      'editar_zonas_entrega',
      'eliminar_zonas_entrega'
    ]
  },
  
  // Solicitudes (feature deshabilitada)
  solicitudes: {
    feature: 'solicitudes',
    permissions: [
      'ver_solicitudes',
      'crear_solicitudes',
      'editar_solicitudes',
      'aprobar_solicitudes',
      'rechazar_solicitudes'
    ]
  },
  
  // Perfil (feature deshabilitada)
  perfil: {
    feature: 'perfil',
    permissions: [
      'ver_perfil',
      'editar_perfil',
      'cambiar_password'
    ]
  },
  
  // Configuración Usuario (feature deshabilitada)
  configuracionUsuario: {
    feature: 'configuracionUsuario',
    permissions: [
      'ver_configuracion_usuario',
      'editar_configuracion_usuario'
    ]
  },
  
  // Cuentas Corrientes (nueva feature)
  cuentasCorrientes: {
    feature: 'cuentasCorrientes',
    permissions: [
      'ver_cuentas_corrientes',
      'crear_movimientos_cuenta',
      'editar_movimientos_cuenta',
      'eliminar_movimientos_cuenta',
      'ver_saldos_cuentas'
    ]
  },
  
  // Movimientos de Stock (nueva feature)
  movimientosStock: {
    feature: 'movimientosStock',
    permissions: [
      'ver_movimientos_stock',
      'crear_movimientos_stock',
      'editar_movimientos_stock',
      'eliminar_movimientos_stock',
      'ajustar_inventario'
    ]
  },
  
  // Auditoría (nueva feature)
  auditoria: {
    feature: 'auditoria',
    permissions: [
      'ver_auditoria',
      'ver_logs_sistema',
      'exportar_logs',
      'ver_cambios_usuario'
    ]
  },
  
  // Backup (feature deshabilitada)
  backup: {
    feature: 'backup',
    permissions: [
      'crear_backup',
      'restaurar_backup',
      'ver_backups',
      'eliminar_backups'
    ]
  },
  
  // Notificaciones (feature deshabilitada)
  notificaciones: {
    feature: 'notificaciones',
    permissions: [
      'ver_notificaciones',
      'crear_notificaciones',
      'editar_notificaciones',
      'eliminar_notificaciones',
      'enviar_notificaciones'
    ]
  },
  
  // Integración AFIP (feature deshabilitada)
  integracionAfip: {
    feature: 'integracionAfip',
    permissions: [
      'ver_configuracion_afip',
      'editar_configuracion_afip',
      'enviar_comprobantes_afip',
      'consultar_estado_afip'
    ]
  },
  
  // Reportes Avanzados (feature deshabilitada)
  reportesAvanzados: {
    feature: 'reportesAvanzados',
    permissions: [
      'generar_reportes_personalizados',
      'crear_reportes_personalizados',
      'editar_reportes_personalizados',
      'eliminar_reportes_personalizados',
      'programar_reportes'
    ]
  }
};

// Función para obtener permisos activos basados en features habilitadas
export function getActivePermissions() {
  const activePermissions: string[] = [];
  
  Object.entries(PERMISSIONS_CONFIG).forEach(([_, config]) => {
    if (FEATURES[config.feature as keyof typeof FEATURES]) {
      activePermissions.push(...config.permissions);
    }
  });
  
  return activePermissions;
}

// Función para verificar si un permiso está activo
export function isPermissionActive(permission: string): boolean {
  const activePermissions = getActivePermissions();
  return activePermissions.includes(permission);
}

// Función para obtener permisos de un módulo específico
export function getModulePermissions(module: string): string[] {
  const config = PERMISSIONS_CONFIG[module as keyof typeof PERMISSIONS_CONFIG];
  return config ? config.permissions : [];
}
