import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Download, LineChart, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProductsChart from "@/components/products-chart"
import { TopProductsTable } from "@/components/top-products-table"
import api from "@/lib/api"
import { useBranches } from "@/hooks/useBranches"
import { useAuth } from "@/hooks/useAuth"
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, parseISO } from "date-fns"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface GeneralStats {
  total_sales: number
  total_revenue: number
}

interface ProductStat {
  product_id: number
  product_name: string
  total_quantity: number
  total_revenue: number // string from decimal? usually backend returns string for decimal
}

export default function AnalisisVentasPage() {
  const [period, setPeriod] = useState("month")
  const [branch, setBranch] = useState("all")
  const [generalStats, setGeneralStats] = useState<GeneralStats>({ total_sales: 0, total_revenue: 0 })
  const [salesByProduct, setSalesByProduct] = useState<ProductStat[]>([])
  const [topProducts, setTopProducts] = useState<ProductStat[]>([])
  const { branches: branchList } = useBranches()
  const { canAccessBranch, hasPermission } = useAuth()

  const activeBranches = branchList.filter(b => b.status === true && canAccessBranch(String(b.id)))


  const handleExportReport = () => {
    try {
      const wb = XLSX.utils.book_new()

      // 1. Hoja de Resumen General
      const { start_date, end_date } = getDateRange()
      const summaryData = [
        ["Reporte de Análisis de Ventas", ""],
        ["Generado el:", format(new Date(), 'dd/MM/yyyy HH:mm')],
        ["Periodo:", `${format(parseISO(start_date), 'dd/MM/yyyy')} - ${format(parseISO(end_date), 'dd/MM/yyyy')}`],
        ["Sucursal:", branch === 'all' ? 'Todas' : activeBranches.find(b => String(b.id) === branch)?.description || branch],
        [],
        ["Métrica", "Valor"],
        ["Total Ventas (Transacciones)", generalStats.total_sales],
        ["Ingresos Totales", `$${Number(generalStats.total_revenue).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
        ["Ticket Promedio", `$${Number(generalStats.total_sales) > 0 ? (Number(generalStats.total_revenue) / generalStats.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}`],
        ["Total Productos Vendidos", salesByProduct.reduce((acc, curr) => acc + Number(curr.total_quantity), 0)]
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

      // Ajustar ancho de columnas para Resumen
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];

      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General")

      // 2. Hoja de Detalle por Producto (Todos los productos)
      if (salesByProduct.length > 0) {
        // Ordenar por ingresos descendente
        const sortedProducts = [...salesByProduct].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const productsData = [
          ["Producto", "Cantidad Vendida", "Ingresos Totales", "Precio Promedio Unitario"],
          ...sortedProducts.map(p => {
            const quantity = Number(p.total_quantity)
            const revenue = Number(p.total_revenue)
            const avgPrice = quantity > 0 ? revenue / quantity : 0
            return [
              p.product_name,
              quantity,
              revenue, // Guardamos como número para que Excel pueda sumar
              avgPrice
            ]
          })
        ]


        const productsDataFormatted = [
          ["Ranking", "Producto", "Cantidad Vendida", "Ingresos Totales", "% del Total"],
          ...sortedProducts.map((p, index) => {
            const revenue = Number(p.total_revenue)
            const percent = generalStats.total_revenue > 0 ? (revenue / Number(generalStats.total_revenue)) * 100 : 0
            return [
              index + 1,
              p.product_name,
              Number(p.total_quantity),
              `$${revenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
              `${percent.toFixed(2)}%`
            ]
          })
        ]
        const wsProductsFormatted = XLSX.utils.aoa_to_sheet(productsDataFormatted)

        // Ajustar anchos
        wsProductsFormatted['!cols'] = [
          { wch: 10 }, // Ranking
          { wch: 50 }, // Producto
          { wch: 15 }, // Cantidad
          { wch: 20 }, // Ingresos
          { wch: 15 }  // %
        ];

        XLSX.utils.book_append_sheet(wb, wsProductsFormatted, "Detalle por Producto")
      }

      // Generar nombre de archivo con fecha y periodo
      const fileName = `analisis_ventas_${period}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success("Informe exportado correctamente", {
        description: "El archivo Excel se ha descargado con el detalle completo."
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.error("Error al exportar el informe")
    }
  }

  // Helper to get dates from period
  const getDateRange = useCallback(() => {
    const now = new Date()
    let start = startOfMonth(now)
    let end = endOfMonth(now)

    switch (period) {
      case 'today':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'yesterday':
        start = startOfDay(subDays(now, 1))
        end = endOfDay(subDays(now, 1))
        break
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'quarter':
        // Simple approx
        start = startOfMonth(subDays(now, 90))
        end = endOfMonth(now)
        break
      case 'year':
        start = startOfYear(now)
        end = endOfYear(now)
        break
    }
    return {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    }
  }, [period])

  const fetchData = useCallback(async () => {
    try {
      const { start_date, end_date } = getDateRange()
      const branchParam = branch !== 'all' ? { branch_id: branch } : {}
      const params = { start_date, end_date, ...branchParam }

      const [generalRes, topProductsRes, salesByProductRes] = await Promise.all([
        api.get('/statistics/general', { params }),
        api.get('/statistics/top-products', { params: { ...params, limit: 5 } }),
        api.get('/statistics/sales-by-product', { params })
      ])

      setGeneralStats(generalRes.data)
      setTopProducts(topProductsRes.data)
      setSalesByProduct(salesByProductRes.data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    }
  }, [getDateRange, branch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Transform data for charts
  const productsChartData = topProducts.map(p => ({
    name: p.product_name,
    cantidad: Number(p.total_quantity),
    ingresos: Number(p.total_revenue)
  }))

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Análisis de Ventas</h2>
        {hasPermission('exportar_estadisticas') && (
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Informe
          </Button>
        )}
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {activeBranches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <LineChart className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(generalStats.total_revenue).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
            {/* <p className="text-xs text-muted-foreground">+18.2% respecto al período anterior</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generalStats.total_sales}</div>
            {/* <p className="text-xs text-muted-foreground">+12.5% respecto al período anterior</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${generalStats.total_sales > 0 ? (Number(generalStats.total_revenue) / generalStats.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
            {/* <p className="text-xs text-muted-foreground">+5.1% respecto al período anterior</p> */}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productos" className="space-y-4">
        <TabsList className="w-fit">
          {/* <TabsTrigger value="ventas">Ventas</TabsTrigger> */}
          <TabsTrigger value="productos">Productos</TabsTrigger>
          {/* <TabsTrigger value="sucursales">Sucursales</TabsTrigger> */}
        </TabsList>
        {/* <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ventas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <SalesChart data={salesChartData} />
            </CardContent>
          </Card>
        </TabsContent> */}
        <TabsContent value="productos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Productos (Top 5)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ProductsChart data={productsChartData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductsTable data={topProducts} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
