import {
  BarChart3,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Map,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
  Wallet,
  Shield,
  Wrench
} from "lucide-react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import features from "@/config/features"
import { useAuth } from "@/hooks/useAuth"
import { useSystemConfigContext } from "@/context/SystemConfigContext"
import { cn } from "@/lib/utils"

export function AppSidebar({ className }: { className?: string }) {
  const location = useLocation()
  const pathname = location.pathname
  const { hasPermission } = useAuth()
  const { config } = useSystemConfigContext()
  const { isMobile, setOpenMobile } = useSidebar()

  // Cerrar sidebar en móviles cuando cambia la ruta
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const systemTitle = config?.system_title || 'RG Gestión'

  return (
    <Sidebar className={cn(
      "w-64 border-r transition-all duration-300 ease-in-out bg-white",
      isMobile && "w-72", // Más ancho en móviles para mejor legibilidad
      className
    )} collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              className="rounded-lg border"
              style={{ 
                backgroundColor: config?.primary_color ? `${config.primary_color}20` : '#EFF6FF',
                borderColor: config?.primary_color ? `${config.primary_color}40` : '#BFDBFE',
              }}
              onMouseEnter={(e) => {
                if (config?.primary_color) {
                  e.currentTarget.style.backgroundColor = `${config.primary_color}30`
                }
              }}
              onMouseLeave={(e) => {
                if (config?.primary_color) {
                  e.currentTarget.style.backgroundColor = `${config.primary_color}20`
                }
              }}
            >
              {(() => {
                // Usar directamente /images/logo.jpg del backend (igual que PDFs)
                // Usa window.location.origin si no hay VITE_API_URL configurado (para producción)
                const apiBaseUrl = import.meta.env.VITE_API_URL || 
                  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8000/api');
                const baseUrl = apiBaseUrl.replace('/api', '') || 
                  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
                const logoUrl = config?.logo_url || `${baseUrl}/images/logo.jpg`;
                return (
                  <img 
                    src={logoUrl} 
                    alt={systemTitle}
                    className="w-8 h-8 rounded-lg object-contain bg-white p-1"
                    onError={(e) => {
                      // Si falla, mostrar inicial sin loguear error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      const fallback = parent?.querySelector('.logo-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                );
              })()}
              <div 
                className="logo-fallback flex aspect-square size-8 items-center justify-center rounded-lg text-white"
                style={{ 
                  display: config?.logo_url ? 'none' : 'flex',
                  backgroundColor: config?.primary_color || '#3B82F6'
                }}
              >
                <Store className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-gray-800">
                  {systemTitle}
                </span>
                <span className="text-xs text-gray-600">
                  v1.0.0
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {features.dashboard && hasPermission('ver_dashboard') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.inventario && hasPermission('ver_productos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/inventario"} tooltip="Inventario">
                  <Link to="/dashboard/inventario">
                    <Package className="h-4 w-4" />
                    <span>Inventario</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {hasPermission('gestionar_combos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/combos"} tooltip="Combos">
                  <Link to="/dashboard/combos">
                    <Package className="h-4 w-4" />
                    <span>Combos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.ventas && hasPermission('ver_ventas') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/ventas"} tooltip="Ventas">
                  <Link to="/dashboard/ventas">
                    <CircleDollarSign className="h-4 w-4" />
                    <span>Ventas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.pos && hasPermission('crear_ventas') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/pos"} tooltip="Punto de Venta">
                  <Link to="/dashboard/pos">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Punto de Venta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.caja && (hasPermission('abrir_cerrar_caja') || hasPermission('ver_movimientos_caja') || hasPermission('crear_movimientos_caja') || hasPermission('ver_historico_caja')) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/caja"} tooltip="Caja">
                  <Link to="/dashboard/caja">
                    <Wallet className="h-4 w-4" />
                    <span>Caja</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.turnos && hasPermission('ver_turnos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/turnos"} tooltip="Turnos">
                  <Link to="/dashboard/turnos">
                    <CalendarClock className="h-4 w-4" />
                    <span>Turnos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.repairs && hasPermission('ver_reparaciones') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/reparaciones"} tooltip="Reparaciones">
                  <Link to="/dashboard/reparaciones">
                    <Wrench className="h-4 w-4" />
                    <span>Reparaciones</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Clientes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {features.clientes && hasPermission('ver_clientes') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/clientes"} tooltip="Clientes">
                  <Link to="/dashboard/clientes">
                    <Users className="h-4 w-4" />
                    <span>Clientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.cuentasCorrientes && hasPermission('gestionar_cuentas_corrientes') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/cuentas-corrientes"} tooltip="Cuentas Corrientes">
                  <Link to="/dashboard/cuentas-corrientes">
                    <Wallet className="h-4 w-4" />
                    <span>Cuentas Corrientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Compras</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {features.proveedores && hasPermission('ver_proveedores') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/proveedores")} tooltip="Proveedores">
                  <Link to="/dashboard/proveedores">
                    <Truck className="h-4 w-4" />
                    <span>Proveedores</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.purchaseOrders && hasPermission('ver_ordenes_compra') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/purchase-orders"} tooltip="Órdenes de Compra">
                  <Link to="/dashboard/purchase-orders">
                    <ClipboardList className="h-4 w-4" />
                    <span>Órdenes de Compra</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission('ver_categorias') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/categorias"} tooltip="Categorías">
                  <Link to="/dashboard/categorias">
                    <FolderOpen className="h-4 w-4" />
                    <span>Categorías</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.sucursales && hasPermission('ver_sucursales') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/sucursales"} tooltip="Sucursales">
                  <Link to="/dashboard/sucursales">
                    <Building2 className="h-4 w-4" />
                    <span>Sucursales</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.zonasEntrega && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/zonas-entrega"} tooltip="Delivery">
                  <Link to="/dashboard/zonas-entrega">
                    <Map className="h-4 w-4" />
                    <span>Delivery</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.shipments && hasPermission('ver_envios') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/envios"} tooltip="Envíos">
                  <Link to="/dashboard/envios">
                    <Package className="h-4 w-4" />
                    <span>Envíos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.usuarios && hasPermission('ver_usuarios') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/usuarios"} tooltip="Usuarios">
                  <Link to="/dashboard/usuarios">
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.roles && hasPermission('ver_roles') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/roles")} tooltip="Roles">
                  <Link to="/dashboard/roles">
                    <Shield className="h-4 w-4" />
                    <span>Roles</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {features.solicitudes && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/solicitudes"} tooltip="Solicitudes">
                  <Link to="/dashboard/solicitudes">
                    <FileText className="h-4 w-4" />
                    <span>Solicitudes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {((features.analisisventas && hasPermission('ver_ventas') && hasPermission('ver_estadisticas')) || 
          (features.reportesInventario && hasPermission('generar_reportes')) ||
          (features.reportesFinancieros && hasPermission('generar_reportes'))) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Reportes</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>

                  {features.analisisventas && hasPermission('ver_ventas') && hasPermission('ver_estadisticas') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/analisis-ventas"} tooltip="Análisis de Ventas">
                        <Link to="/dashboard/analisis-ventas">
                          <BarChart3 className="h-4 w-4" />
                          <span>Análisis de Ventas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {features.reportesInventario && hasPermission('generar_reportes') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/reportes-inventario"} tooltip="Reportes de Inventario">
                        <Link to="/dashboard/reportes-inventario">
                          <ClipboardList className="h-4 w-4" />
                          <span>Reportes de Inventario</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {features.reportesFinancieros && hasPermission('generar_reportes') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/reportes-financieros"} tooltip="Reportes Financieros">
                        <Link to="/dashboard/reportes-financieros">
                          <FileBarChart className="h-4 w-4" />
                          <span>Reportes Financieros</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
        {(features.perfil || 
          features.configuracionUsuario || 
          (features.configuracionSistema && hasPermission('ver_configuracion_sistema'))) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {features.perfil && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/perfil"} tooltip="Mi Perfil">
                      <Link to="/dashboard/perfil">
                        <User className="h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {features.configuracionUsuario && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/configuracion-usuario"} tooltip="Configuración Usuario">
                      <Link to="/dashboard/configuracion-usuario">
                        <Settings className="h-4 w-4" />
                        <span>Configuración Usuario</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {features.facturacion && hasPermission('ver_ventas') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/facturacion"} tooltip="Facturación">
                      <Link to="/dashboard/facturacion">
                        <CreditCard className="h-4 w-4" />
                        <span>Facturación</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {features.configuracionSistema && hasPermission('ver_configuracion_sistema') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/configuracion-sistema"} tooltip="Configuración">
                      <Link to="/dashboard/configuracion-sistema">
                        <Settings className="w-4 h-4" />
                        <span>Configuración</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Volver al Dashboard">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Volver al Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}