const defaultFeatures = {

  dashboard: true,
  roles: true,

  categorias: true,
  combos: true,
  repairs: false,

  analisisventas: false,
  caja: true,
  clientes: true,

  configuracionSistema: true,
  cuentasCorrientes: true,

  historialVentas: true,
  inventario: true,

  pos: true,
  proveedores: true,
  purchaseOrders: true,
  transferencias: true,
  reportesInventario: false,
  reportesFinancieros: true,

  sucursales: true,

  usuarios: true,

  ventas: true,

  shipments: true,
  auditorias: true,
  metodosPago: true,
  gastos: true,
} as const;

let envFeatures = {};
try {
  const envFeaturesStr = import.meta.env.VITE_FEATURES;
  if (envFeaturesStr) {
    envFeatures = JSON.parse(envFeaturesStr);
  }
} catch (e) {
  console.warn('Failed to parse VITE_FEATURES', e);
}


const features = { ...defaultFeatures, ...envFeatures };

export default features;
export type FeatureFlags = typeof features;
