const features = {
  // Core features
  dashboard: true,
  roles: true,
  
  categorias: true,
  combos: true,
  repairs: false,
  
  analisisventas: false,
  caja: true,
  clientes: true,
  configuracionUsuario: false,
  configuracionSistema: true,
  cuentasCorrientes: true,
  facturacion: false,
  historialVentas: true,
  inventario: true,
  perfil: false,
  pos: true,
  proveedores: true,
  purchaseOrders: true,
  reportesInventario: false,
  solicitudes: false,
  sucursales: true,
  turnos: false,
  usuarios: true,
  ventas: true,
  zonasEntrega: false,
  
  shipments: true,
} as const;

export default features;
export type FeatureFlags = typeof features;
