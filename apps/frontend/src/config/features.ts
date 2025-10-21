export const FEATURES = {
  // Módulos principales (siempre activos)
  dashboard: true,
  inventario: true,
  ventas: true,
  historialVentas: true,
  pos: true,
  caja: true,
  clientes: true,
  proveedores: true,
  categorias: true,
  sucursales: true,
  usuarios: true,
  roles: true,
  combos: true,
  configuracionSistema: false,
  purchaseOrders: true,
  
  // Módulos opcionales (pueden deshabilitarse)
  turnos: false ,
  repairs: false, 
  zonasEntrega: false,
  solicitudes: false,
  analisisVentas: false,
  reportesInventario: false,
  perfil: false,
  configuracionUsuario: false,
  facturacion: false,
  
  // Features adicionales que pueden agregarse
  cuentasCorrientes: false,
  movimientosStock: true,
  auditoria: true,
  backup: false,
  notificaciones: false,
  integracionAfip: false,
  reportesAvanzados: false,
  analisisventas: false,
};
