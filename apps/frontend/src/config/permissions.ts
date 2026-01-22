// Configuración completa de permisos por módulo/feature
import FEATURES from './features';

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

  // Combos
  combos: {
    feature: 'combos',
    permissions: [
      'gestionar_combos',
      'crear_combos',
      'editar_combos',
      'eliminar_combos'
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
      'aplicar_descuentos',
      'gestionar_presupuestos',
      'solo_crear_presupuestos'
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
      'gestionar_cuentas_corrientes'
    ]
  },

  // Cuentas Corrientes
  cuentasCorrientes: {
    feature: 'cuentasCorrientes',
    permissions: [
      'gestionar_cuentas_corrientes'
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
      'activar_desactivar_usuario',
      'ver_estadisticas_usuario'
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
      'ver_configuracion_sistema',
      'editar_configuracion_sistema',
      'gestionar_tipo_cambio'
    ]
  },

  // Configuración General (deshabilitado - duplicado)
  configuracion: {
    feature: 'configuracionSistema', // Usa la misma feature que configuracionSistema
    permissions: [
      'ver_configuracion_sistema',
      'editar_configuracion_sistema'
    ]
  },

  // Auditorías
  auditorias: {
    feature: 'auditorias',
    permissions: [
      'ver_auditorias'
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



  // Análisis de Ventas
  analisisventas: {
    feature: 'analisisventas',
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

  // Reportes Financieros
  reportesFinancieros: {
    feature: 'reportesFinancieros',
    permissions: [
      'generar_reportes',
      'exportar_reportes'
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
  },

  // Envíos
  envios: {
    feature: 'envios',
    permissions: [
      'ver_envios',         // Ver listado de envíos
      'crear_envios',       // Crear nuevos envíos
      'editar_envios',      // Editar envíos existentes
      'cancelar_envio',     // Cancelar envíos
      'gestionar_envios',   // Gestionar estados/etapas de envíos
      'registrar_pago_envio', // Registar pago de envío
      'imprimir_etiqueta_envio' // Imprimir etiquetas
    ]
  },

  // Transferencias
  transferencias: {
    feature: 'transferencias',
    permissions: [
      'ver_transferencias',
      'crear_transferencias',
      'editar_transferencias',
      'completar_transferencias',
      'cancelar_transferencias'
    ]
  },

  // Métodos de Pago
  metodosPago: {
    feature: 'metodosPago',
    permissions: [
      'ver_metodos_pago',
      'crear_metodos_pago',
      'editar_metodos_pago',
      'eliminar_metodos_pago'
    ]
  }
};

// Función para obtener permisos activos basados en features habilitadas
export function getActivePermissions() {
  const activePermissions: string[] = [];

  Object.entries(PERMISSIONS_CONFIG).forEach(([, config]) => {
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

// Función helper para verificar si un permiso está deshabilitado por su feature asociada
export function isPermissionDisabledByFeature(permission: string): boolean {
  // Buscar en la configuración a qué feature pertenece el permiso
  for (const [, config] of Object.entries(PERMISSIONS_CONFIG)) {
    if (config.permissions.includes(permission)) {
      // Si encontramos el permiso, verificamos si la feature está habilitada
      const featureKey = config.feature as keyof typeof FEATURES;
      // Si la feature está explícitamente en false, el permiso está deshabilitado
      if (FEATURES[featureKey] === false) {
        return true;
      }
      // Si encontramos el permiso y la feature es true, terminamos la búsqueda (no está deshabilitado por feature)
      return false;
    }
  }

  // Si el permiso no está en la configuración (es un permiso base o no mapeado), 
  // asumimos que NO está deshabilitado por feature (comportamiento seguro por defecto para no romper admins)
  return false;
}
