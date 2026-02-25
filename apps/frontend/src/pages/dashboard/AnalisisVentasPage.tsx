import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, BarChart3, TrendingUp, Package, DollarSign, Search, RefreshCw, Users, Clock, Tag, Truck, CreditCard, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useBranches } from "@/hooks/useBranches"
import { useAuth } from "@/hooks/useAuth"
import { useStatistics, useStatisticsFilterOptions } from "@/hooks/useStatistics"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "@/components/ui/date-range-picker"
import * as XLSX from "xlsx"
import { sileo } from "sileo"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import type { StatisticsFilters, SelectOption } from "@/types/statistics.types"
import {
  CHART_COLORS,
  HOURS,
  formatCurrency,
  formatNumber,
  formatAxisCurrency,
  getDayName,
  formatHourRange,
  percentOf,
} from "@/utils/statistics.utils"

// ─── Component ───────────────────────────────────────────────────────────

export default function AnalisisVentasPage() {
  const { hasPermission } = useAuth()
  const { branches: branchList } = useBranches()
  const activeBranches = branchList.filter(b => b.status === true)
  const { users, categories, suppliers } = useStatisticsFilterOptions()

  // ─── Filter state ────────────────────────────────────────────────────

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [branchId, setBranchId] = useState("all")
  const [userId, setUserId] = useState("all")
  const [categoryId, setCategoryId] = useState("all")
  const [supplierId, setSupplierId] = useState("all")
  const [productSearch, setProductSearch] = useState("")
  const [hourFrom, setHourFrom] = useState("all")
  const [hourTo, setHourTo] = useState("all")
  const [activeTab, setActiveTab] = useState("resumen")

  /** Memoized filters para el hook */
  const filters: StatisticsFilters = useMemo(() => ({
    start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    branch_id: branchId,
    user_id: userId,
    category_id: categoryId,
    supplier_id: supplierId,
    product_search: productSearch.trim() || undefined,
    hour_from: hourFrom,
    hour_to: hourTo,
  }), [dateRange, branchId, userId, categoryId, supplierId, productSearch, hourFrom, hourTo])

  /** Datos y estado del hook principal */
  const {
    stats,
    byUser,
    byCategory,
    bySupplier,
    byHour,
    byPaymentMethod,
    byDayOfWeek,
    dailyTrend,
    topProducts,
    loading,
    refetch,
  } = useStatistics(filters)

  // ─── Export ──────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new()

      // Sheet helpers
      const addSheet = (name: string, headers: string[], rows: (string | number)[][]) => {
        const data = [headers, ...rows]
        const ws = XLSX.utils.aoa_to_sheet(data)
        ws['!cols'] = headers.map(() => ({ wch: 20 }))
        XLSX.utils.book_append_sheet(wb, ws, name)
      }

      // Resumen
      addSheet("Resumen", ["Métrica", "Valor"], [
        ["Total Ventas", stats?.total_sales ?? 0],
        ["Unidades Vendidas", stats?.total_units ?? 0],
        ["Ingresos Totales", stats?.total_revenue ?? 0],
        ["Ticket Promedio", stats?.average_ticket ?? 0],
      ])

      // Por Usuario
      if (byUser.length > 0) {
        addSheet("Por Usuario", ["Usuario", "Ventas", "Unidades", "Ingresos"],
          byUser.map(u => [u.user_name, Number(u.total_sales), Number(u.total_units), Number(u.total_revenue)])
        )
      }

      // Por Categoría
      if (byCategory.length > 0) {
        addSheet("Por Categoría", ["Categoría", "Ventas", "Unidades", "Ingresos"],
          byCategory.map(c => [c.category_name, Number(c.total_sales), Number(c.total_units), Number(c.total_revenue)])
        )
      }

      // Por Proveedor
      if (bySupplier.length > 0) {
        addSheet("Por Proveedor", ["Proveedor", "Ventas", "Unidades", "Ingresos"],
          bySupplier.map(s => [s.supplier_name, Number(s.total_sales), Number(s.total_units), Number(s.total_revenue)])
        )
      }

      // Top Productos
      if (topProducts.length > 0) {
        addSheet("Top Productos", ["#", "Código", "Producto", "Categoría", "Proveedor", "Unidades", "Ingresos", "Ventas"],
          topProducts.map((p, i) => [i + 1, p.product_code || '-', p.product_name, p.category_name, p.supplier_name, Number(p.total_units), Number(p.total_revenue), Number(p.total_sales)])
        )
      }

      // Por Hora
      if (byHour.length > 0) {
        addSheet("Por Hora", ["Hora", "Ventas", "Unidades", "Ingresos"],
          byHour.map(h => [formatHourRange(h.hour), Number(h.total_sales), Number(h.total_units), Number(h.total_revenue)])
        )
      }

      // Por Método de Pago
      if (byPaymentMethod.length > 0) {
        addSheet("Por Método de Pago", ["Método", "Ventas", "Ingresos"],
          byPaymentMethod.map(p => [p.payment_method_name, Number(p.total_sales), Number(p.total_revenue)])
        )
      }

      // Por Día de Semana
      if (byDayOfWeek.length > 0) {
        addSheet("Por Día de Semana", ["Día", "Ventas", "Unidades", "Ingresos"],
          byDayOfWeek.map(d => [getDayName(d.day_of_week), Number(d.total_sales), Number(d.total_units), Number(d.total_revenue)])
        )
      }

      XLSX.writeFile(wb, `estadisticas_ventas_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
      sileo.success({ title: "Informe exportado correctamente" })
    } catch (error) {
      console.error("Export error:", error)
      sileo.error({ title: "Error al exportar el informe" })
    }
  }, [stats, byUser, byCategory, bySupplier, topProducts, byHour, byPaymentMethod, byDayOfWeek])

  // ─── Clear filters ───────────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
    setBranchId("all")
    setUserId("all")
    setCategoryId("all")
    setSupplierId("all")
    setProductSearch("")
    setHourFrom("all")
    setHourTo("all")
  }, [])

  const activeFilterCount = useMemo(() => [
    branchId !== 'all',
    userId !== 'all',
    categoryId !== 'all',
    supplierId !== 'all',
    productSearch.trim() !== '',
    hourFrom !== 'all',
    hourTo !== 'all',
  ].filter(Boolean).length, [branchId, userId, categoryId, supplierId, productSearch, hourFrom, hourTo])

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estadísticas de Ventas</h2>
          <p className="text-muted-foreground">Análisis avanzado con filtros combinados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refetch} disabled={loading} title="Actualizar">
            <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>
          {hasPermission('exportar_estadisticas') && (
            <Button variant="outline" onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Filters Card */}
      <FiltersCard
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        branchId={branchId}
        onBranchChange={setBranchId}
        userId={userId}
        onUserChange={setUserId}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        supplierId={supplierId}
        onSupplierChange={setSupplierId}
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
        hourFrom={hourFrom}
        onHourFromChange={setHourFrom}
        hourTo={hourTo}
        onHourToChange={setHourTo}
        activeBranches={activeBranches}
        users={users}
        categories={categories}
        suppliers={suppliers}
        activeFilterCount={activeFilterCount}
        onClear={clearFilters}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Ventas Totales" value={stats ? formatNumber(stats.total_sales) : '—'} subtitle="Transacciones" icon={TrendingUp} iconColor="text-emerald-600" />
        <SummaryCard title="Unidades Vendidas" value={stats ? formatNumber(stats.total_units) : '—'} subtitle="Unidades totales" icon={Package} iconColor="text-blue-600" />
        <SummaryCard title="Ingresos Totales" value={stats ? formatCurrency(stats.total_revenue) : '—'} subtitle="Total facturado" icon={DollarSign} iconColor="text-green-600" />
        <SummaryCard title="Ticket Promedio" value={stats ? formatCurrency(stats.average_ticket) : '—'} subtitle="Por transacción" icon={BarChart3} iconColor="text-violet-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Resumen</span></TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Usuarios</span></TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5"><Tag className="h-3.5 w-3.5" /><span className="hidden sm:inline">Categorías</span></TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-1.5"><Truck className="h-3.5 w-3.5" /><span className="hidden sm:inline">Proveedores</span></TabsTrigger>
          <TabsTrigger value="productos" className="gap-1.5"><Package className="h-3.5 w-3.5" /><span className="hidden sm:inline">Productos</span></TabsTrigger>
          <TabsTrigger value="horas" className="gap-1.5"><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Horas</span></TabsTrigger>
          <TabsTrigger value="pagos" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /><span className="hidden sm:inline">Pagos</span></TabsTrigger>
          <TabsTrigger value="dias" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /><span className="hidden sm:inline">Días</span></TabsTrigger>
        </TabsList>

        {/* ─── Tab: Resumen ─── */}
        <TabsContent value="resumen" className="space-y-4">
          <DailyTrendChart data={dailyTrend} />
        </TabsContent>

        {/* ─── Tab: Usuarios ─── */}
        <TabsContent value="usuarios" className="space-y-4">
          <GroupedStatsCard
            title="Ventas por Usuario"
            description="Desglose de ventas, unidades e ingresos por vendedor"
            data={byUser.map(u => ({ id: u.user_id, name: u.user_name, total_sales: u.total_sales, total_units: u.total_units, total_revenue: u.total_revenue }))}
            totalRevenue={stats?.total_revenue ?? 0}
            chartLayout="vertical"
          />
        </TabsContent>

        {/* ─── Tab: Categorías ─── */}
        <TabsContent value="categorias" className="space-y-4">
          <GroupedStatsCard
            title="Ventas por Categoría"
            description="Desglose por categoría de producto"
            data={byCategory.map(c => ({ id: c.category_id, name: c.category_name, total_sales: c.total_sales, total_units: c.total_units, total_revenue: c.total_revenue }))}
            totalRevenue={stats?.total_revenue ?? 0}
          />
        </TabsContent>

        {/* ─── Tab: Proveedores ─── */}
        <TabsContent value="proveedores" className="space-y-4">
          <GroupedStatsCard
            title="Ventas por Proveedor"
            description="Desglose por proveedor del producto"
            data={bySupplier.map(s => ({ id: s.supplier_id, name: s.supplier_name, total_sales: s.total_sales, total_units: s.total_units, total_revenue: s.total_revenue }))}
            totalRevenue={stats?.total_revenue ?? 0}
            chartLayout="vertical"
          />
        </TabsContent>

        {/* ─── Tab: Productos ─── */}
        <TabsContent value="productos" className="space-y-4">
          <TopProductsTable data={topProducts} />
        </TabsContent>

        {/* ─── Tab: Horas ─── */}
        <TabsContent value="horas" className="space-y-4">
          <HourChart data={byHour} />
        </TabsContent>

        {/* ─── Tab: Pagos ─── */}
        <TabsContent value="pagos" className="space-y-4">
          <PaymentMethodCard data={byPaymentMethod} />
        </TabsContent>

        {/* ─── Tab: Días ─── */}
        <TabsContent value="dias" className="space-y-4">
          <DayOfWeekCard data={byDayOfWeek} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Extracted Components ──────────────────────────────────────────────

/** Tarjeta de resumen individual */
function SummaryCard({ title, value, subtitle, icon: Icon, iconColor }: {
  title: string; value: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; iconColor: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

/** Estado vacío reutilizable */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{message}</p>
      </div>
    </div>
  )
}

/** Selector genérico para filtros */
function FilterSelect({ label, value, onChange, placeholder, options, allLabel }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: SelectOption[]
  allLabel: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.name || o.description || `${label} ${o.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Panel de filtros */
function FiltersCard({
  dateRange, onDateRangeChange, branchId, onBranchChange,
  userId, onUserChange, categoryId, onCategoryChange,
  supplierId, onSupplierChange, productSearch, onProductSearchChange,
  hourFrom, onHourFromChange, hourTo, onHourToChange,
  activeBranches, users, categories, suppliers,
  activeFilterCount, onClear,
}: {
  dateRange: DateRange | undefined; onDateRangeChange: (r: DateRange | undefined) => void
  branchId: string; onBranchChange: (v: string) => void
  userId: string; onUserChange: (v: string) => void
  categoryId: string; onCategoryChange: (v: string) => void
  supplierId: string; onSupplierChange: (v: string) => void
  productSearch: string; onProductSearchChange: (v: string) => void
  hourFrom: string; onHourFromChange: (v: string) => void
  hourTo: string; onHourToChange: (v: string) => void
  activeBranches: Array<{ id: number; description: string; status?: boolean }>
  users: SelectOption[]; categories: SelectOption[]; suppliers: SelectOption[]
  activeFilterCount: number; onClear: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filtros</CardTitle>
          <div className="flex gap-2 items-center">
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onClear}>Limpiar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Rango de Fechas</Label>
            <DatePickerWithRange selected={dateRange} onSelect={onDateRangeChange} showClearButton />
          </div>

          <FilterSelect label="Sucursal" value={branchId} onChange={onBranchChange} placeholder="Todas" allLabel="Todas las sucursales"
            options={activeBranches.map(b => ({ id: b.id, name: b.description }))} />
          <FilterSelect label="Usuario" value={userId} onChange={onUserChange} placeholder="Todos" allLabel="Todos los usuarios" options={users} />
          <FilterSelect label="Categoría" value={categoryId} onChange={onCategoryChange} placeholder="Todas" allLabel="Todas las categorías" options={categories} />
          <FilterSelect label="Proveedor" value={supplierId} onChange={onSupplierChange} placeholder="Todos" allLabel="Todos los proveedores" options={suppliers} />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Producto (código o descripción)</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar producto..." value={productSearch} onChange={(e) => onProductSearchChange(e.target.value)} className="pl-8" />
            </div>
          </div>

          <HourSelect label="Hora desde" value={hourFrom} onChange={onHourFromChange} suffix="00" />
          <HourSelect label="Hora hasta" value={hourTo} onChange={onHourToChange} suffix="59" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Selector de hora */
function HourSelect({ label, value, onChange, suffix }: {
  label: string; value: string; onChange: (v: string) => void; suffix: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Cualquier hora" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier hora</SelectItem>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}:{suffix}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Chart Components ──────────────────────────────────────────────────

/** Gráfico de tendencia diaria */
function DailyTrendChart({ data }: { data: Array<{ date: string; total_sales: number; total_revenue: number }> }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Diaria</CardTitle>
          <CardDescription>Evolución de ventas en el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState message="No hay datos para el período seleccionado" />
        </CardContent>
      </Card>
    )
  }

  const dateFormatter = (v: string) => { try { return format(new Date(v), 'dd/MM') } catch { return v } }
  const labelFormatter = (v: string) => { try { return format(new Date(v), 'dd/MM/yyyy', { locale: es }) } catch { return v } }

  // Ajustar dominio del eje Y para ingresos para mejor visualización
  const minRevenue = Math.min(...data.map(d => d.total_revenue))
  const maxRevenue = Math.max(...data.map(d => d.total_revenue))
  const revenueDomain = [Math.floor(minRevenue * 0.95), Math.ceil(maxRevenue * 1.05)]

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos Diarios</CardTitle>
          <CardDescription>Evolución de ingresos ($)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={dateFormatter} tick={{ fontSize: 11 }} />
              <YAxis domain={revenueDomain} tickFormatter={formatAxisCurrency} tick={{ fontSize: 11 }} width={70} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                labelFormatter={labelFormatter}
              />
              <Line type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transacciones Diarias</CardTitle>
          <CardDescription>Cantidad de ventas por día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={dateFormatter} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [formatNumber(value), 'Ventas']}
                labelFormatter={labelFormatter}
              />
              <Bar dataKey="total_sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/** Card genérica con gráfico de barras + tabla para datos agrupados (usuario, categoría, proveedor) */
interface GroupedStatRow {
  id: number | string | null
  name: string
  total_sales: number
  total_units: number
  total_revenue: number
}

function GroupedStatsCard({ title, description, data, totalRevenue, chartLayout }: {
  title: string
  description: string
  data: GroupedStatRow[]
  totalRevenue: number
  chartLayout?: 'vertical'
}) {
  const chartData = data.slice(0, 10)

  // Ajustar dominio del eje Y para mejor visualización
  const minRevenue = chartData.length > 0 ? Math.min(...chartData.map(d => Number(d.total_revenue))) : 0
  const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map(d => Number(d.total_revenue))) : 0
  const revenueDomain = minRevenue !== maxRevenue ? [Math.floor(minRevenue * 0.95), Math.ceil(maxRevenue * 1.05)] : [0, Math.ceil(maxRevenue * 1.1)]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              {chartLayout === 'vertical' ? (
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={revenueDomain} tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Ingresos']} />
                  <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
                  <YAxis domain={revenueDomain} tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Ingresos']} />
                  <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={String(row.id ?? 'null')}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(row.total_sales))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(row.total_units))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.total_revenue))}</TableCell>
                      <TableCell className="text-right">{percentOf(Number(row.total_revenue), totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState message={`No hay datos de ${title.toLowerCase()} para el período seleccionado`} />
        )}
      </CardContent>
    </Card>
  )
}

/** Tabla y gráfico de top productos */
function TopProductsTable({ data }: { data: Array<{ product_id: number; product_code: string; product_name: string; category_name: string; supplier_name: string; total_units: number; total_revenue: number; total_sales: number }> }) {
  // Gráfico: top 10 productos por ingresos
  const chartData = data.slice(0, 10).map((p) => ({
    ...p,
    name: p.product_name.length > 20 ? p.product_name.slice(0, 20) + '…' : p.product_name
  }))
  // Dominio eje Y
  const minRevenue = chartData.length > 0 ? Math.min(...chartData.map(d => Number(d.total_revenue))) : 0
  const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map(d => Number(d.total_revenue))) : 0
  const revenueDomain = minRevenue !== maxRevenue ? [Math.floor(minRevenue * 0.95), Math.ceil(maxRevenue * 1.05)] : [0, Math.ceil(maxRevenue * 1.1)]

  // Colores para los 3 primeros
  const badgeColors = [
    'bg-[#FFD700] text-black', // Oro
    'bg-[#C0C0C0] text-black', // Plata
    'bg-[#CD7F32] text-white', // Bronce
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Productos</CardTitle>
        <CardDescription>Productos más vendidos según los filtros aplicados</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis domain={revenueDomain} tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Ingresos']} />
                <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p, i) => (
                    <TableRow key={p.product_id}>
                      <TableCell>
                        <span className={`w-7 flex justify-center items-center rounded font-bold ${i < 3 ? badgeColors[i] : 'bg-secondary text-secondary-foreground'}`} title={i === 0 ? 'Oro' : i === 1 ? 'Plata' : i === 2 ? 'Bronce' : ''}>
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.product_code || '—'}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.product_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.category_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.supplier_name}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNumber(Number(p.total_units))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(p.total_revenue))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(p.total_sales))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState message="No hay datos de productos para el período seleccionado" />
        )}
      </CardContent>
    </Card>
  )
}

/** Gráfico de ventas por hora */
function HourChart({ data }: { data: Array<{ hour: number; total_sales: number; total_units: number; total_revenue: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por Hora del Día</CardTitle>
        <CardDescription>Distribución horaria de ventas e ingresos</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(v) => `${String(v).padStart(2, '0')}h`} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} width={70} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} width={50} />
                <Tooltip formatter={(value: number, name: string) => [name === 'total_revenue' ? formatCurrency(value) : formatNumber(value), name === 'total_revenue' ? 'Ingresos' : 'Ventas']} labelFormatter={formatHourRange} />
                <Bar yAxisId="left" dataKey="total_revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="total_revenue" />
                <Bar yAxisId="right" dataKey="total_sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="total_sales" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Hora</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Ingresos</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.map((h) => (
                    <TableRow key={h.hour}>
                      <TableCell className="font-medium">{formatHourRange(h.hour)}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(h.total_sales))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(h.total_units))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(h.total_revenue))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState message="No hay datos por hora para el período seleccionado" />
        )}
      </CardContent>
    </Card>
  )
}

/** Gráfico de ventas por método de pago */
function PaymentMethodCard({ data }: { data: Array<{ payment_method_id: number; payment_method_name: string; total_sales: number; total_revenue: number }> }) {
  const totalPayments = data.reduce((acc, pm) => acc + Number(pm.total_revenue), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por Método de Pago</CardTitle>
        <CardDescription>Desglose de ingresos por forma de pago</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="payment_method_name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Ingresos']} />
                <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Método de Pago</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead className="text-right">Ingresos</TableHead><TableHead className="text-right">% Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.payment_method_id}>
                      <TableCell className="font-medium">{p.payment_method_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(p.total_sales))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(p.total_revenue))}</TableCell>
                      <TableCell className="text-right">{percentOf(Number(p.total_revenue), totalPayments)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState message="No hay datos de métodos de pago para el período seleccionado" />
        )}
      </CardContent>
    </Card>
  )
}

/** Gráfico de ventas por día de la semana */
function DayOfWeekCard({ data }: { data: Array<{ day_of_week: number; total_sales: number; total_units: number; total_revenue: number }> }) {
  const chartData = data.map(d => ({ ...d, day_name: getDayName(d.day_of_week) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por Día de la Semana</CardTitle>
        <CardDescription>Distribución semanal de ventas e ingresos</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number, name: string) => [name === 'total_revenue' ? formatCurrency(value) : formatNumber(value), name === 'total_revenue' ? 'Ingresos' : 'Ventas']} />
                <Bar yAxisId="left" dataKey="total_revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="total_revenue" />
                <Bar yAxisId="right" dataKey="total_sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="total_sales" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Día</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Ingresos</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.day_of_week}>
                      <TableCell className="font-medium">{getDayName(d.day_of_week)}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(d.total_sales))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(d.total_units))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(d.total_revenue))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState message="No hay datos por día de la semana para el período seleccionado" />
        )}
      </CardContent>
    </Card>
  )
}
