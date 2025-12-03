import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/dashboard/overview"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { StockAlerts } from "@/components/dashboard/stock-alerts"
import { SalesByBranch } from "@/components/dashboard/sales-by-branch"
import { MetricCard } from "@/components/ui/metric-card"
import { useSales } from "@/hooks/useSales"
import { useDashboard } from "@/hooks/useDashboard"
import { useBranch } from "@/context/BranchContext"
import ViewSaleDialog from "@/components/view-sale-dialog"
import { AfipStatusBadge } from "@/components/sales/AfipStatusBadge"
import useApi from "@/hooks/useApi"
import { useState } from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/context/AuthContext"

export default function DashboardPage() {
  const { selectedBranchIds, branches, selectionChangeToken } = useBranch()
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false)
  const { request } = useApi()
  const { sales, isLoading: salesLoading, error: salesError } = useSales({ 
    limit: 5,
    branchId: selectedBranchIds,
    externalDeps: [selectionChangeToken]
  })

  const {
    generalStats,
    stockAlerts,
    salesByBranch,
    monthlySales,
    salesSummary,
    isLoading: dashboardLoading
  } = useDashboard({
    branchId: selectedBranchIds,
    limit: 10,
    externalDeps: [selectionChangeToken]
  })

  const { hasPermission } = useAuth();

  const handleViewSale = async (sale: any) => {
    if (!sale?.id) return;
    setLoadingSaleDetail(true);
    try {
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` });
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response;
      setSelectedSale(fullSale);
      setSaleDialogOpen(true);
    } catch (error) {
      console.error("Error al cargar los detalles de la venta:", error);
      alert("No se pudo cargar el detalle de la venta");
    } finally {
      setLoadingSaleDetail(false);
    }
  };

  /**
   * Maneja la actualización de una venta después de autorización AFIP
   */
  const handleSaleUpdated = async (updatedSale: any) => {
    // Actualizar la venta seleccionada
    if (selectedSale && selectedSale.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }
    
    // El hook useSales se actualizará automáticamente en la próxima carga
    // pero podemos forzar una recarga si es necesario
    // Por ahora, solo actualizamos la venta seleccionada
  };

  // Helper para mostrar nombre de sucursales seleccionadas
  const getBranchDescription = () => {
    if (selectedBranchIds.length === 0) return '';
    if (selectedBranchIds.length === 1) {
      const branch = branches.find(b => String(b.id) === selectedBranchIds[0]);
      return branch ? ` - ${branch.description}` : '';
    }
    if (selectedBranchIds.length === branches.length) {
      return ' - Todas las sucursales';
    }
    return ` - ${selectedBranchIds.length} sucursales seleccionadas`;
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    })
  }

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0
    const sign = isPositive ? '+' : ''
    return `${sign}${percentage.toFixed(1)}%`
  }

  const getCustomerName = (sale: any) => {
    const customerObj = sale.client || sale.customer;

    // Handle full sale object with a customer/client object
    if (customerObj && typeof customerObj === 'object') {
      if (customerObj.person) {
        const fullName = `${customerObj.person.first_name || ''} ${customerObj.person.last_name || ''}`.trim();
        if (fullName) return fullName;
      }
      if (customerObj.business_name) {
        return customerObj.business_name;
      }
    }

    // Handle summary object where customer is a string
    if (sale.customer && typeof sale.customer === 'string' && sale.customer !== 'N/A') {
      return sale.customer;
    }
    
    // Fallback for other possible structures
    if (sale.customer_name) {
      return sale.customer_name;
    }

    return "Consumidor Final";
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReceiptType = (sale: any) => {
    return {
      displayName: sale.receiptType?.name || sale.receipt_type?.name || 'Venta',
      afipCode: sale.receiptType?.afip_code || sale.receipt_type?.afip_code || '0'
    }
  }


  return (
    <ProtectedRoute permissions={['ver_dashboard']} requireAny={true}>
      <div className="flex h-full w-full flex-col space-y-4 p-2 sm:p-4 md:p-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        
        <Tabs defaultValue="overview" className="flex flex-col space-y-4 flex-1">
          <TabsList className="w-fit bg-gray-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black-600 data-[state=active]:shadow-md">Vista General</TabsTrigger>
          </TabsList>

         <TabsContent value="overview" className="space-y-4 flex-1 overflow-y-auto pr-2 sm:pr-4">
            {/* Grid responsive para métricas */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {hasPermission('ver_ventas') && (
                <>
                  <MetricCard
                    title="Ventas Totales (Este Mes)"
                    value={formatCurrency(generalStats?.total_sales || 0)}
                    subtitle={salesSummary?.growth_percentage !== undefined 
                      ? salesSummary.growth_percentage === null 
                        ? "Nuevo período (sin datos anteriores)"
                        : `${formatPercentage(salesSummary.growth_percentage)} respecto al mes anterior`
                      : '+0.0% respecto al mes anterior'}
                    subtitleColor={
                      (salesSummary?.growth_percentage ?? 0) > 0 ? 'text-green-600' : 
                      (salesSummary?.growth_percentage ?? 0) < 0 ? 'text-red-600' : 
                      'text-orange-600'
                    }
                    isLoading={dashboardLoading}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-emerald-600"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    }
                  />
                  <MetricCard
                    title="Clientes Únicos (Este Mes)"
                    value={(generalStats?.unique_customers || 0).toLocaleString("es-AR")}
                    subtitle="En el período actual"
                    isLoading={dashboardLoading}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-amber-600"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    }
                  />
                  <MetricCard
                    title="Ventas (Este Mes)"
                    value={(generalStats?.sales_count || 0).toLocaleString("es-AR")}
                    subtitle="Transacciones realizadas"
                    isLoading={dashboardLoading}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-blue-600"
                      >
                        <path d="M3 3h18v4H3z" />
                        <path d="M16 13H3v-4h13z" />
                        <path d="M21 13H3v8h18z" />
                      </svg>
                    }
                  />
                </>
              )}
              <MetricCard
                title="Productos Activos"
                value={(generalStats?.active_products || 0).toLocaleString("es-AR")}
                subtitle="Disponibles para venta"
                isLoading={dashboardLoading}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-violet-600"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                }
              />
            </div>
            
            {/* Cards principales - responsive */}
            <div className="flex flex-col gap-4 lg:flex-row items-stretch min-h-0">
              {hasPermission('ver_ventas') && (
                <Card className="w-full lg:flex-[4] lg:basis-0 border border-gray-200 shadow-md h-full min-h-[300px] sm:min-h-[400px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gray-900 text-lg sm:text-xl">Resumen de Ventas</CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      Ventas mensuales del año actual
                      {getBranchDescription()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2 flex-1 min-h-0 overflow-hidden">
                    <Overview data={monthlySales} isLoading={dashboardLoading} />
                  </CardContent>
                </Card>
              )}
              {hasPermission('ver_ventas') && (
                <Card className="w-full lg:flex-[3] lg:basis-0 border border-gray-200 shadow-md h-full min-h-[300px] sm:min-h-[455px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gray-900 text-lg sm:text-xl">Ventas Recientes</CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      Últimas 5 ventas realizadas en el sistema.
                      {salesError && (
                        <span className="text-red-500 text-xs block mt-1">
                          Error al cargar ventas: {salesError}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <RecentSales 
                      sales={sales} 
                      isLoading={salesLoading} 
                      onViewSale={handleViewSale}
                      getCustomerName={getCustomerName}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Grid inferior - responsive */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
              {hasPermission('ver_stock') && (
                <Card className="lg:col-span-3 border border-gray-200 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gray-900 text-lg sm:text-xl">Alertas de Stock</CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      Productos con stock bajo o agotado
                      {getBranchDescription()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StockAlerts alerts={stockAlerts} isLoading={dashboardLoading} />
                  </CardContent>
                </Card>
              )}
              {hasPermission('ver_ventas') && (
                <Card className={`border border-gray-200 shadow-md ${hasPermission('ver_stock') ? 'lg:col-span-4' : 'lg:col-span-7'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gray-900 text-lg sm:text-xl">Ventas por Sucursal</CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      Comparativa de ventas entre sucursales del mes actual
                      {getBranchDescription()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <SalesByBranch data={salesByBranch} isLoading={dashboardLoading} />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

      {/* Diálogo para ver detalles de venta */}
      {saleDialogOpen && (
        loadingSaleDetail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <span className="text-blue-700 font-medium">Cargando detalle de venta...</span>
            </div>
          </div>
        ) : (
          hasPermission('ver_ventas') && (
            <ViewSaleDialog
              sale={selectedSale}
              open={saleDialogOpen}
              onOpenChange={setSaleDialogOpen}
              getCustomerName={getCustomerName}
              formatDate={formatDate}
              getReceiptType={getReceiptType}
              onDownloadPdf={async (sale) => {
                if (!sale || !sale.id) {
                  alert("No se puede descargar el PDF: ID de venta faltante.");
                  return;
                }
                try {
                  const response = await request({ 
                    method: 'GET', 
                    url: `/pos/sales/${sale.id}/pdf`,
                    responseType: 'blob'
                  });
                  if (!response || !(response instanceof Blob)) {
                    throw new Error("La respuesta del servidor no es un archivo PDF válido.");
                  }
                  const blob = new Blob([response], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
                  const receiptNumber = sale.receipt_number || sale.id;
                  const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Error downloading PDF:", error);
                  alert("Error al descargar PDF");
                }
              }}
              onSaleUpdated={handleSaleUpdated}
            />
          )
        )
      )}
      </div>
    </ProtectedRoute>
  )
}