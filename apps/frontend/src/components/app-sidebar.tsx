import {
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  Shield,
  Wrench,
  Receipt
} from "lucide-react"

import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { useEffect } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import features from "@/config/features"
import { useAuth } from "@/hooks/useAuth"
import { useSystemConfigContext } from "@/context/SystemConfigContext"
import { resolveSystemImageUrl } from "@/lib/imageUtils"

export function AppSidebar({ className }: { className?: string }) {
  const location = useLocation()
  const pathname = location.pathname
  const { hasPermission } = useAuth()
  const { config } = useSystemConfigContext()
  const { isMobile, setOpenMobile } = useSidebar()
  const { open } = useSidebar()

  // Cerrar sidebar en móviles cuando cambia la ruta
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const systemTitle = config?.system_title || 'RG Gestión'

  const navMain = [
    {
      title: "Ventas",
      url: "#",
      icon: CircleDollarSign,
      isActive: pathname.startsWith("/dashboard/ventas") || pathname.startsWith("/dashboard/pos") || pathname.startsWith("/dashboard/clientes") || pathname.startsWith("/dashboard/cuentas-corrientes") || pathname.startsWith("/dashboard/analisis-ventas") || pathname.startsWith("/dashboard/envios") || pathname.startsWith("/dashboard/ventas-pendientes"),
      items: [
        {
          title: "Punto de Venta",
          url: "/dashboard/pos",
          icon: ShoppingCart,
          visible: features.pos && hasPermission('crear_ventas'),
        },
        {
          title: "Historial de Ventas",
          url: "/dashboard/ventas",
          icon: CircleDollarSign,
          visible: features.ventas && hasPermission('ver_ventas'),
        },

        {
          title: "Envíos",
          url: "/dashboard/envios",
          icon: Package,
          visible: features.shipments && hasPermission('ver_envios'),
        },
        {
          title: "Análisis de Ventas",
          url: "/dashboard/analisis-ventas",
          icon: BarChart3,
          visible: features.analisisventas && hasPermission('ver_ventas') && hasPermission('ver_estadisticas'),
        },
        {
          title: "Clientes",
          url: "/dashboard/clientes",
          icon: Users,
          visible: features.clientes && hasPermission('ver_clientes'),
        },
        {
          title: "Cuentas Corrientes",
          url: "/dashboard/cuentas-corrientes",
          icon: Wallet,
          visible: features.cuentasCorrientes && hasPermission('gestionar_cuentas_corrientes'),
        },
      ],

    },
    {
      title: "Inventario",
      url: "#",
      icon: Package,
      isActive: pathname.startsWith("/dashboard/inventario") || pathname.startsWith("/dashboard/categorias") || pathname.startsWith("/dashboard/combos") || pathname.startsWith("/dashboard/reportes-inventario"),
      items: [
        {
          title: "Productos",
          url: "/dashboard/inventario",
          icon: Package,
          visible: features.inventario && hasPermission('ver_productos'),
        },
        {
          title: "Categorías",
          url: "/dashboard/categorias",
          icon: FolderOpen,
          visible: features.categorias && hasPermission('ver_categorias'),
        },
        {
          title: "Combos",
          url: "/dashboard/combos",
          icon: Package,
          visible: features.combos && hasPermission('gestionar_combos'),
        },
        {
          title: "Reportes de Inventario",
          url: "/dashboard/reportes-inventario",
          icon: ClipboardList,
          visible: features.reportesInventario && hasPermission('generar_reportes'),
        },
      ],
    },
    {
      title: "Compras",
      url: "#",
      icon: Truck,
      isActive: pathname.startsWith("/dashboard/proveedores") || pathname.startsWith("/dashboard/purchase-orders") || pathname.startsWith("/dashboard/stock-transfers"),
      items: [
        {
          title: "Proveedores",
          url: "/dashboard/proveedores",
          icon: Truck,
          visible: features.proveedores && hasPermission('ver_proveedores'),
        },
        {
          title: "Órdenes de Compra",
          url: "/dashboard/purchase-orders",
          icon: ClipboardList,
          visible: features.purchaseOrders && hasPermission('ver_ordenes_compra'),
        },
        {
          title: "Transferencias",
          url: "/dashboard/stock-transfers",
          icon: ArrowRightLeft,
          visible: features.transferencias && hasPermission('ver_transferencias'),
        },
      ],
    },
    {
      title: "Finanzas",
      url: "#",
      icon: Wallet,
      isActive: pathname.startsWith("/dashboard/caja") || pathname.startsWith("/dashboard/metodos-pago") || pathname.startsWith("/dashboard/reportes-financieros"),
      items: [
        {
          title: "Caja",
          url: "/dashboard/caja",
          icon: Wallet,
          visible: features.caja && (hasPermission('abrir_cerrar_caja') || hasPermission('ver_movimientos_caja') || hasPermission('crear_movimientos_caja') || hasPermission('ver_historico_caja')),
        },
        {
          title: "Métodos de Pago",
          url: "/dashboard/metodos-pago",
          icon: CreditCard,
          visible: features.metodosPago && hasPermission('ver_metodos_pago'),
        },
        {
          title: "Reportes Financieros",
          url: "/dashboard/reportes-financieros",
          icon: FileBarChart,
          visible: features.reportesFinancieros && hasPermission('generar_reportes'),
        },

      ],
    },
    {
      title: "Gastos",
      url: "#",
      icon: Receipt,
      isActive: pathname.startsWith("/dashboard/gastos"),
      items: [
        {
          title: "Listado de Gastos",
          url: "/dashboard/gastos",
          icon: ClipboardList,
          visible: features.gastos && hasPermission('ver_gastos'),
        },
        {
          title: "Empleados",
          url: "/dashboard/gastos/empleados",
          icon: Users,
          visible: features.gastos && hasPermission('ver_empleados'),
        },
        {
          title: "Categorías",
          url: "/dashboard/gastos/categorias",
          icon: FolderOpen,
          visible: features.gastos && hasPermission('ver_categorias_gastos'),
        },
      ],
    },
    {
      title: "Servicio Técnico",
      url: "#",
      icon: Wrench,
      isActive: pathname.startsWith("/dashboard/reparaciones"),
      items: [
        {
          title: "Reparaciones",
          url: "/dashboard/reparaciones",
          icon: ClipboardList,
          visible: features.repairs && hasPermission('ver_reparaciones'),
        },
      ],
    },
    {
      title: "Gestión",
      url: "#",
      icon: Briefcase,
      isActive: pathname.startsWith("/dashboard/sucursales") || pathname.startsWith("/dashboard/usuarios") || pathname.startsWith("/dashboard/roles") || pathname.startsWith("/dashboard/auditorias"),
      items: [
        {
          title: "Sucursales",
          url: "/dashboard/sucursales",
          icon: Building2,
          visible: features.sucursales && hasPermission('ver_sucursales'),
        },
        {
          title: "Usuarios",
          url: "/dashboard/usuarios",
          icon: Users,
          visible: features.usuarios && hasPermission('ver_usuarios'),
        },
        {
          title: "Roles",
          url: "/dashboard/roles",
          icon: Shield,
          visible: features.roles && hasPermission('ver_roles'),
        },
        {
          title: "Auditorías",
          url: "/dashboard/auditorias",
          icon: FileText,
          visible: features.auditorias && hasPermission('ver_auditorias'),
        },

      ],
    },
  ]

  return (
    <Sidebar className={className} collapsible="icon">
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
                const logoUrl = resolveSystemImageUrl(config?.logo_url);

                return (
                  <img
                    src={logoUrl}
                    alt={systemTitle}
                    className="w-8 h-8 rounded-lg object-contain bg-white p-1"
                    onError={(e) => {
                      console.error('Logo load failed:', logoUrl);
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
                  v{__APP_VERSION__}
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

              {navMain.map((group) => {
                // Filter items based on visibility
                const visibleItems = group.items.filter(item => item.visible !== false)

                if (visibleItems.length === 0) return null

                return (
                  <SidebarMenuItem key={group.title}>
                    <Collapsible
                      defaultOpen={group.isActive}
                      className="group/collapsible"
                      disabled={!open}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={group.title} isActive={group.isActive}>
                          {group.icon && <group.icon className="h-4 w-4" />}
                          <span>{group.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {visibleItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                                <Link to={item.url}>
                                  {item.icon && <item.icon className="h-4 w-4" />}
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                )
              })}

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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {/* SidebarTrigger removed as it's now in the header */}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}