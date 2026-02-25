/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Download, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import { useAuth } from "@/hooks/useAuth"
import type { DateRange } from "react-day-picker"

interface FinancialSummary {
  period: {
    from: string
    to: string
  }
  income: {
    sales: {
      total: number
      count: number
    }
    cash_movements: {
      total: number
      count: number
    }
    total: number
  }
  expenses: {
    purchases: {
      total: number
      count: number
    }
    cash_movements: {
      total: number
      count: number
    }
    total: number
  }
  balance: number
  balance_percentage: number
}

interface MovementDetail {
  id: number
  amount: number
  description: string
  movement_type: string | null
  user: string | null
  branch: string | null
  created_at: string
  date: string
}

interface SaleDetail {
  id: number
  total: number
  receipt_number: string
  receipt_type: string | null
  customer: string
  branch: string | null
  user: string | null
  date: string
  created_at: string
}

interface PurchaseDetail {
  id: number
  total_amount: number
  supplier: string
  branch: string | null
  order_date: string
  currency: string
  notes: string | null
}

interface MovementsDetail {
  income_movements: MovementDetail[]
  expense_movements: MovementDetail[]
  sales_detail: SaleDetail[]
  purchases_detail: PurchaseDetail[]
}

export default function ReportesFinancierosPage() {
  const { request, loading } = useApi()
  const { branches, hasPermission } = useAuth()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      from: firstDayOfMonth,
      to: today
    }
  })

  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [movementsDetail, setMovementsDetail] = useState<MovementsDetail | null>(null)
  const [showIncomeDetail, setShowIncomeDetail] = useState(false)
  const [showExpenseDetail, setShowExpenseDetail] = useState(false)
  const [showSalesDetail, setShowSalesDetail] = useState(false)
  const [showPurchasesDetail, setShowPurchasesDetail] = useState(false)

  const loadFinancialSummary = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return
    }

    try {
      const params: any = {
        from_date: format(dateRange?.from, 'yyyy-MM-dd'),
        to_date: format(dateRange?.to, 'yyyy-MM-dd'),
      }

      if (selectedBranch && selectedBranch !== "all") {
        params.branch_id = selectedBranch
      }

      const [summaryResponse, movementsResponse] = await Promise.all([
        request({
          method: 'GET',
          url: '/financial-reports/summary',
          params
        }),
        request({
          method: 'GET',
          url: '/financial-reports/movements-detail',
          params
        })
      ])

      if (summaryResponse?.data) {
        setSummary(summaryResponse.data)
      }

      if (movementsResponse?.data) {
        setMovementsDetail(movementsResponse.data)
      }
    } catch (error: any) {
      console.error('Error al cargar resumen financiero:', error)
      sileo.error({ title: 'Error',
        description: error?.response?.data?.error || 'No se pudo cargar el resumen financiero'
      })
    }
  }

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    loadFinancialSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedBranch])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleExport = () => {
    sileo.info({ title: 'Funcionalidad de exportación próximamente disponible' })
  }

  const handleQuickPeriod = (period: string) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (period) {
      case 'today':
        from = new Date(today)
        to = new Date(today)
        break
      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        from = yesterday
        to = yesterday
        break
      }
      case 'week':
        from = new Date(today)
        from.setDate(from.getDate() - 7)
        break
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'quarter': {
        const quarter = Math.floor(today.getMonth() / 3)
        from = new Date(today.getFullYear(), quarter * 3, 1)
        break
      }
      case 'year':
        from = new Date(today.getFullYear(), 0, 1)
        break
      default:
        from = new Date(today.getFullYear(), today.getMonth(), 1)
    }

    setDateRange({ from, to })
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes Financieros</h2>
        {hasPermission('exportar_reportes') && (
          <Button variant="outline" onClick={handleExport} disabled={!summary}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Informe
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
          <DatePickerWithRange
            selected={dateRange}
            onSelect={setDateRange}
            className="w-full md:w-[300px]"
            showClearButton={true}
            onClear={() => {
              const today = new Date()
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
              setDateRange({
                from: firstDayOfMonth,
                to: today
              })
            }}
          />

          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.description || branch.name || `Sucursal ${branch.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleQuickPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período rápido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="week">Últimos 7 días</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando resumen financiero...</div>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Cards de resumen */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.income.total)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.income.sales.count} ventas • {summary.income.cash_movements.count} movimientos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.expenses.total)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.expenses.purchases.count} compras • {summary.expenses.cash_movements.count} movimientos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.balance_percentage >= 0 ? '+' : ''}{summary.balance_percentage.toFixed(2)}% del ingreso
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen</CardTitle>
                <DollarSign className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">
                  {summary.income.total > 0
                    ? ((summary.balance / summary.income.total) * 100).toFixed(2)
                    : '0.00'}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Margen de ganancia
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desglose detallado */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ingresos */}
            <Card>
              <CardHeader>
                <CardTitle>Desglose de Ingresos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ventas</span>
                    <span className="text-sm font-medium">{formatCurrency(summary.income.sales.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground ml-4">
                      {summary.income.sales.count} transacciones
                    </div>
                    {movementsDetail && movementsDetail.sales_detail.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSalesDetail(!showSalesDetail)}
                        className="h-6 text-xs"
                      >
                        {showSalesDetail ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ocultar detalle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ver detalle
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {showSalesDetail && movementsDetail && movementsDetail.sales_detail.length > 0 && (
                    <div className="mt-4 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Comprobante</TableHead>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs">Usuario</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movementsDetail.sales_detail.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="text-xs">
                                {format(new Date(sale.date), 'dd/MM/yyyy', { locale: es })}
                              </TableCell>
                              <TableCell className="text-xs">
                                {sale.receipt_type || '-'} #{sale.receipt_number || '-'}
                              </TableCell>
                              <TableCell className="text-xs">{sale.customer || '-'}</TableCell>
                              <TableCell className="text-xs">{sale.user || '-'}</TableCell>
                              <TableCell className="text-xs text-right text-emerald-600 font-medium">
                                {formatCurrency(sale.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Movimientos de Caja (Entradas)</span>
                    <span className="text-sm font-medium">{formatCurrency(summary.income.cash_movements.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground ml-4">
                      {summary.income.cash_movements.count} movimientos
                    </div>
                    {movementsDetail && movementsDetail.income_movements.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowIncomeDetail(!showIncomeDetail)}
                        className="h-6 text-xs"
                      >
                        {showIncomeDetail ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ocultar detalle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ver detalle
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {showIncomeDetail && movementsDetail && movementsDetail.income_movements.length > 0 && (
                    <div className="mt-4 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="text-xs">Usuario</TableHead>
                            <TableHead className="text-xs text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movementsDetail.income_movements.map((movement) => (
                            <TableRow key={movement.id}>
                              <TableCell className="text-xs">
                                {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </TableCell>
                              <TableCell className="text-xs">{movement.movement_type || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.description || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.user || '-'}</TableCell>
                              <TableCell className="text-xs text-right text-emerald-600 font-medium">
                                {formatCurrency(movement.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Ingresos</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(summary.income.total)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Egresos */}
            <Card>
              <CardHeader>
                <CardTitle>Desglose de Egresos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Compras</span>
                    <span className="text-sm font-medium">{formatCurrency(summary.expenses.purchases.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground ml-4">
                      {summary.expenses.purchases.count} órdenes completadas
                    </div>
                    {movementsDetail && movementsDetail.purchases_detail.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPurchasesDetail(!showPurchasesDetail)}
                        className="h-6 text-xs"
                      >
                        {showPurchasesDetail ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ocultar detalle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ver detalle
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {showPurchasesDetail && movementsDetail && movementsDetail.purchases_detail.length > 0 && (
                    <div className="mt-4 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Proveedor</TableHead>
                            <TableHead className="text-xs">Moneda</TableHead>
                            <TableHead className="text-xs">Notas</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movementsDetail.purchases_detail.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="text-xs">
                                {format(new Date(purchase.order_date), 'dd/MM/yyyy', { locale: es })}
                              </TableCell>
                              <TableCell className="text-xs">{purchase.supplier || '-'}</TableCell>
                              <TableCell className="text-xs">{purchase.currency || 'ARS'}</TableCell>
                              <TableCell className="text-xs">{purchase.notes || '-'}</TableCell>
                              <TableCell className="text-xs text-right text-red-600 font-medium">
                                {formatCurrency(purchase.total_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Movimientos de Caja (Salidas)</span>
                    <span className="text-sm font-medium">{formatCurrency(summary.expenses.cash_movements.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground ml-4">
                      {summary.expenses.cash_movements.count} movimientos
                    </div>
                    {movementsDetail && movementsDetail.expense_movements.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                        className="h-6 text-xs"
                      >
                        {showExpenseDetail ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ocultar detalle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ver detalle
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {showExpenseDetail && movementsDetail && movementsDetail.expense_movements.length > 0 && (
                    <div className="mt-4 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="text-xs">Usuario</TableHead>
                            <TableHead className="text-xs text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movementsDetail.expense_movements.map((movement) => (
                            <TableRow key={movement.id}>
                              <TableCell className="text-xs">
                                {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </TableCell>
                              <TableCell className="text-xs">{movement.movement_type || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.description || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.user || '-'}</TableCell>
                              <TableCell className="text-xs text-right text-red-600 font-medium">
                                {formatCurrency(movement.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Egresos</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(summary.expenses.total)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!loading && !summary && dateRange?.from && dateRange?.to && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              No hay datos disponibles para el período seleccionado
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

