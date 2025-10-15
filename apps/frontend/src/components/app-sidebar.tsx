import {
  BarChart3,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
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
import { FEATURES } from "@/config/features"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

export function AppSidebar({ className }: { className?: string }) {
  const location = useLocation()
  const pathname = location.pathname
  const { hasPermission } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()

  // Cerrar sidebar en móviles cuando cambia la ruta
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar className={cn(
      "w-64 border-r transition-all duration-300 ease-in-out bg-white",
      isMobile && "w-72", // Más ancho en móviles para mejor legibilidad
      className
    )} collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Store className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-blue-900">RG Gestión</span>
                <span className="text-xs text-blue-700">v1.0.0</span>
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
              {FEATURES.dashboard && hasPermission('ver_dashboard') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.inventario && hasPermission('ver_productos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/inventario"} tooltip="Inventario">
                  <Link to="/dashboard/inventario">
                    <Package className="h-4 w-4" />
                    <span>Inventario</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.ventas && hasPermission('ver_ventas') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/ventas"} tooltip="Ventas">
                  <Link to="/dashboard/ventas">
                    <CircleDollarSign className="h-4 w-4" />
                    <span>Ventas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.pos && hasPermission('crear_ventas') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/pos"} tooltip="Punto de Venta">
                  <Link to="/dashboard/pos">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Punto de Venta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.caja && (hasPermission('abrir_cerrar_caja') || hasPermission('ver_movimientos_caja') || hasPermission('crear_movimientos_caja') || hasPermission('ver_historico_caja')) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/caja"} tooltip="Caja">
                  <Link to="/dashboard/caja">
                    <Wallet className="h-4 w-4" />
                    <span>Caja</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.turnos && hasPermission('ver_turnos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/turnos"} tooltip="Turnos">
                  <Link to="/dashboard/turnos">
                    <CalendarClock className="h-4 w-4" />
                    <span>Turnos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.repairs && hasPermission('ver_reparaciones') && (
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
              {FEATURES.clientes && hasPermission('ver_clientes') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/clientes"} tooltip="Clientes">
                  <Link to="/dashboard/clientes">
                    <Users className="h-4 w-4" />
                    <span>Clientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.cuentasCorrientes && hasPermission('ver_cuentas_corrientes') && (
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
              {FEATURES.proveedores && hasPermission('ver_proveedores') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/proveedores")} tooltip="Proveedores">
                  <Link to="/dashboard/proveedores">
                    <Truck className="h-4 w-4" />
                    <span>Proveedores</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.purchaseOrders && hasPermission('ver_ordenes_compra') && (
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
              {FEATURES.sucursales && hasPermission('ver_sucursales') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/sucursales"} tooltip="Sucursales">
                  <Link to="/dashboard/sucursales">
                    <Building2 className="h-4 w-4" />
                    <span>Sucursales</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.zonasEntrega && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/zonas-entrega"} tooltip="Delivery">
                  <Link to="/dashboard/zonas-entrega">
                    <Map className="h-4 w-4" />
                    <span>Delivery</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.usuarios && hasPermission('ver_usuarios') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/usuarios"} tooltip="Usuarios">
                  <Link to="/dashboard/usuarios">
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.roles && hasPermission('ver_roles') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/roles")} tooltip="Roles">
                  <Link to="/dashboard/roles">
                    <Shield className="h-4 w-4" />
                    <span>Roles</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
              {FEATURES.solicitudes && (
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
        {((FEATURES.analisisventas && hasPermission('ver_ventas') && hasPermission('ver_estadisticas')) || 
          (FEATURES.reportesInventario && hasPermission('generar_reportes'))) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Reportes</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>

                  {FEATURES.analisisventas && hasPermission('ver_ventas') && hasPermission('ver_estadisticas') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/analisis-ventas"} tooltip="Análisis de Ventas">
                        <Link to="/dashboard/analisis-ventas">
                          <BarChart3 className="h-4 w-4" />
                          <span>Análisis de Ventas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {FEATURES.reportesInventario && hasPermission('generar_reportes') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/reportes-inventario"} tooltip="Reportes de Inventario">
                        <Link to="/dashboard/reportes-inventario">
                          <ClipboardList className="h-4 w-4" />
                          <span>Reportes de Inventario</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
        {(FEATURES.perfil || 
          FEATURES.configuracionUsuario || 
          (FEATURES.facturacion && hasPermission('ver_ventas')) || 
          (FEATURES.configuracionSistema && hasPermission('ver_configuracion'))) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {FEATURES.perfil && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/perfil"} tooltip="Mi Perfil">
                      <Link to="/dashboard/perfil">
                        <User className="h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {FEATURES.configuracionUsuario && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/configuracion-usuario"} tooltip="Configuración Usuario">
                      <Link to="/dashboard/configuracion-usuario">
                        <Settings className="h-4 w-4" />
                        <span>Configuración Usuario</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {FEATURES.facturacion && hasPermission('ver_ventas') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/facturacion"} tooltip="Facturación">
                      <Link to="/dashboard/facturacion">
                        <CreditCard className="h-4 w-4" />
                        <span>Facturación</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}
                  {FEATURES.configuracionSistema && hasPermission('ver_configuracion') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/configuracion"} tooltip="Configuración Sistema">
                      <Link to="/dashboard/configuracion">
                        <Settings className="h-4 w-4" />
                        <span>Configuración Sistema</span>
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