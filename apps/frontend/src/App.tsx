import LayoutDashboard from "./pages/dashboard/LayoutDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Routes, Route, Navigate } from 'react-router-dom'; // No importes BrowserRouter aquí
import LoginPage from './pages/auth/LoginPage'
import AnalisisVentasPage from '@/pages/dashboard/AnalisisVentasPage'
import CajaPage from '@/pages/dashboard/CajaPage'
import CategoriesPage from '@/pages/dashboard/CategoriesPage'
import ClientesPage from '@/pages/dashboard/ClientesPage'
import ComprasClientePage from '@/pages/dashboard/ComprasClientePage'
import ConfiguracionUsuarioPage from '@/pages/dashboard/ConfiguracionUsuarioPage'
import CurrentAccountsPage from '@/pages/dashboard/CurrentAccountsPage'
import CuentaCorrienteClientePage from '@/pages/dashboard/CuentaCorrienteClientePage'
import ConfiguracionPage from '@/pages/dashboard/ConfiguracionPage'
import ConfiguracionSistemaPage from '@/pages/dashboard/ConfiguracionSistemaPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EditarClientePage from '@/pages/dashboard/EditarClientePage'
import EditarRolPage from '@/pages/dashboard/EditarRolPage'
import EditarSucursalPage from '@/pages/dashboard/EditarSucursalPage'
import EditarUsuarioPage from '@/pages/dashboard/EditarUsuarioPage'
import EditCategoryPage from '@/pages/dashboard/categories/EditCategoryPage'
import FacturacionPage from '@/pages/dashboard/FacturacionPage'
import HistorialVentasPage from '@/pages/dashboard/HistorialVentasPage'
import InventarioPage from '@/pages/dashboard/InventarioPage'
import NewCategoryPage from '@/pages/dashboard/categories/NewCategoryPage'
import NuevaSucursalPage from '@/pages/dashboard/NuevaSucursalPage'
import NuevoClientePage from '@/pages/dashboard/NuevoClientePage'
import NuevoRolPage from '@/pages/dashboard/NuevoRolPage'
import NuevoUsuarioPage from '@/pages/dashboard/NuevoUsuarioPage'
import PerfilPage from '@/pages/dashboard/PerfilPage'
import PosPage from '@/pages/dashboard/PosPage'
import CompleteSalePage from '@/pages/dashboard/CompleteSalePage'
import ProveedoresPage from '@/pages/dashboard/ProveedoresPage'
import PurchaseOrderPage from '@/pages/dashboard/PurchaseOrderPage'
import ReportesInventarioPage from '@/pages/dashboard/ReportesInventarioPage'
import RolesPage from '@/pages/dashboard/RolesPage'
import SolicitudesPage from '@/pages/dashboard/SolicitudesPage'
import SucursalesPage from '@/pages/dashboard/SucursalesPage'
import TurnosPage from '@/pages/dashboard/TurnosPage'
import UsuarioPage from '@/pages/dashboard/UsuarioPage'
import UserPerformancePage from '@/pages/dashboard/UserPerformancePage'
import VentasPage from '@/pages/dashboard/VentasPage'
import VentasSucursalPage from '@/pages/dashboard/VentasSucursalPage'
import VerClientePage from '@/pages/dashboard/VerClientePage'
import VerRolPage from '@/pages/dashboard/VerRolPage'
import VerSucursalPage from '@/pages/dashboard/VerSucursalPage'
import VerUsuarioPage from '@/pages/dashboard/VerUsuarioPage'
import ViewCategoryPage from '@/pages/dashboard/categories/ViewCategoryPage'
import ZonasEntregaPage from '@/pages/dashboard/ZonasEntregaPage'
import ReparacionesPage from '@/pages/dashboard/ReparacionesPage'
import CombosPage from '@/pages/dashboard/CombosPage'
import ShipmentsPage from '@/pages/shipments/ShipmentsPage'
import ViewShipmentPage from '@/pages/shipments/ViewShipmentPage'
import features from '@/config/features'


function App() {
  return (
    <>
      {/* Simplemente renderiza las rutas, los providers están en main.tsx */}
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        
        {/* Rutas anidadas del Dashboard */}
        <Route path="/dashboard" element={<LayoutDashboard />}>
          <Route index element={<DashboardPage />} />
          {features.analisisventas && <Route path="analisis-ventas" element={<ProtectedRoute permissions={['ver_ventas', 'ver_estadisticas']} requireAny={false}><AnalisisVentasPage /></ProtectedRoute>} />}
          {features.caja && <Route path="caja" element={<ProtectedRoute permissions={['abrir_cerrar_caja', 'ver_movimientos_caja', 'crear_movimientos_caja', 'ver_historico_caja']} requireAny={true}><CajaPage /></ProtectedRoute>} />}
          {features.categorias && <Route path="categorias" element={<ProtectedRoute permissions={['ver_categorias']}><CategoriesPage /></ProtectedRoute>} />}
          {features.categorias && <Route path="categorias/:id" element={<ProtectedRoute permissions={['editar_categorias']}><EditCategoryPage /></ProtectedRoute>} />}
          {features.categorias && <Route path="categorias/:id/ver" element={<ProtectedRoute permissions={['ver_categorias']}><ViewCategoryPage /></ProtectedRoute>} />}
          {features.categorias && <Route path="categorias/nuevo" element={<ProtectedRoute permissions={['crear_categorias']}><NewCategoryPage /></ProtectedRoute>} />}
          {features.combos && <Route path="combos" element={<ProtectedRoute permissions={['gestionar_combos']}><CombosPage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes" element={<ProtectedRoute permissions={['ver_clientes']}><ClientesPage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes/:id/compras" element={<ProtectedRoute permissions={['ver_clientes', 'ver_ventas']} requireAny={false}><ComprasClientePage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes/:id/cuenta-corriente" element={<ProtectedRoute permissions={['gestionar_cuentas_corrientes']}><CuentaCorrienteClientePage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes/:id/editar" element={<ProtectedRoute permissions={['editar_clientes']}><EditarClientePage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes/:id/ver" element={<ProtectedRoute permissions={['ver_clientes']}><VerClientePage /></ProtectedRoute>} />}
          {features.clientes && <Route path="clientes/nuevo" element={<ProtectedRoute permissions={['crear_clientes']}><NuevoClientePage /></ProtectedRoute>} />}
          {features.configuracionUsuario && <Route path="configuracion-usuario" element={<ConfiguracionUsuarioPage />} />}
          {features.configuracionSistema && <Route path="configuracion" element={<ProtectedRoute permissions={['ver_configuracion_sistema']}><ConfiguracionPage /></ProtectedRoute>} />}
          {features.configuracionSistema && <Route path="configuracion-sistema" element={<ProtectedRoute permissions={['ver_configuracion_sistema']}><ConfiguracionSistemaPage /></ProtectedRoute>} />}
          {features.cuentasCorrientes && <Route path="cuentas-corrientes" element={<ProtectedRoute permissions={['gestionar_cuentas_corrientes']}><CurrentAccountsPage /></ProtectedRoute>} />}
          {features.facturacion && <Route path="facturacion" element={<ProtectedRoute permissions={['ver_ventas']}><FacturacionPage /></ProtectedRoute>} />}
          {features.historialVentas && <Route path="historial-ventas" element={<ProtectedRoute permissions={['ver_ventas']}><HistorialVentasPage /></ProtectedRoute>} />}
          {features.inventario && <Route path="inventario" element={<ProtectedRoute permissions={['ver_productos']}><InventarioPage /></ProtectedRoute>} />}
          {features.perfil && <Route path="perfil" element={<PerfilPage />} />}
          {features.pos && <Route path="pos" element={<ProtectedRoute permissions={['crear_ventas']}><PosPage /></ProtectedRoute>} />}
          {features.pos && <Route path="pos/completar-venta" element={<ProtectedRoute permissions={['crear_ventas']}><CompleteSalePage /></ProtectedRoute>} />}
          {features.proveedores && <Route path="proveedores" element={<ProtectedRoute permissions={['ver_proveedores']}><ProveedoresPage /></ProtectedRoute>} />}
          {features.purchaseOrders && <Route path="purchase-orders" element={<ProtectedRoute permissions={['ver_ordenes_compra']}><PurchaseOrderPage /></ProtectedRoute>} />}
          {features.reportesInventario && <Route path="reportes-inventario" element={<ProtectedRoute permissions={['generar_reportes']}><ReportesInventarioPage /></ProtectedRoute>} />}
          {features.roles && <Route path="roles" element={<ProtectedRoute permissions={['ver_roles']}><RolesPage /></ProtectedRoute>} />}
          {features.roles && <Route path="roles/:id" element={<ProtectedRoute permissions={['editar_roles']}><EditarRolPage /></ProtectedRoute>} />}
          {features.roles && <Route path="roles/:id/ver" element={<ProtectedRoute permissions={['ver_roles']}><VerRolPage /></ProtectedRoute>} />}
          {features.roles && <Route path="roles/nuevo" element={<ProtectedRoute permissions={['crear_roles']}><NuevoRolPage /></ProtectedRoute>} />}
          {features.repairs && <Route path="reparaciones" element={<ProtectedRoute permissions={['ver_reparaciones']}><ReparacionesPage /></ProtectedRoute>} />}
          {features.solicitudes && <Route path="solicitudes" element={<SolicitudesPage />} />}
          {features.sucursales && <Route path="sucursales" element={<ProtectedRoute permissions={['ver_sucursales']}><SucursalesPage /></ProtectedRoute>} />}
          {features.sucursales && <Route path="sucursales/:id/editar" element={<ProtectedRoute permissions={['editar_sucursales']}><EditarSucursalPage /></ProtectedRoute>} />}
          {features.sucursales && <Route path="sucursales/:id/ventas" element={<ProtectedRoute permissions={['ver_ventas']}><VentasSucursalPage /></ProtectedRoute>} />}
          {features.sucursales && <Route path="sucursales/:id/ver" element={<ProtectedRoute permissions={['ver_sucursales']}><VerSucursalPage /></ProtectedRoute>} />}
          {features.sucursales && <Route path="sucursales/nuevo" element={<ProtectedRoute permissions={['crear_sucursales']}><NuevaSucursalPage /></ProtectedRoute>} />}
          {features.turnos && <Route path="turnos" element={<ProtectedRoute permissions={['ver_turnos']}><TurnosPage /></ProtectedRoute>} />}
          {features.usuarios && <Route path="usuarios" element={<ProtectedRoute permissions={['ver_usuarios']}><UsuarioPage /></ProtectedRoute>} />}
          {features.usuarios && <Route path="usuarios/:id" element={<ProtectedRoute permissions={['editar_usuarios']}><EditarUsuarioPage /></ProtectedRoute>} />}
          {features.usuarios && <Route path="usuarios/:id/ver" element={<ProtectedRoute permissions={['ver_usuarios']}><VerUsuarioPage /></ProtectedRoute>} />}
          {features.usuarios && <Route path="usuarios/:id/desempeno" element={<ProtectedRoute permissions={['ver_estadisticas_usuario']}><UserPerformancePage /></ProtectedRoute>} />}
          {features.usuarios && <Route path="usuarios/nuevo" element={<ProtectedRoute permissions={['crear_usuarios']}><NuevoUsuarioPage /></ProtectedRoute>} />}
          {features.ventas && <Route path="ventas" element={<ProtectedRoute permissions={['ver_ventas']}><VentasPage /></ProtectedRoute>} />}
          {features.zonasEntrega && <Route path="zonas-entrega" element={<ZonasEntregaPage />} />}
          {features.shipments && <Route path="envios" element={<ProtectedRoute permissions={['ver_envios']}><ShipmentsPage /></ProtectedRoute>} />}
          {features.shipments && <Route path="envios/:id" element={<ProtectedRoute permissions={['ver_envios']}><ViewShipmentPage /></ProtectedRoute>} />}
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </>
  );
}

export default App;