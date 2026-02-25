import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Download, Loader2, X } from 'lucide-react'
import useApi from '@/hooks/useApi'
import { sileo } from "sileo"
import { format, startOfMonth } from 'date-fns'

interface CashReportsProps {
  currentBranchId?: number
}

export default function CashReports({ currentBranchId = 1 }: CashReportsProps) {
  const { request } = useApi()
  const [isLoading, setIsLoading] = useState(false)

  // Estados para el reporte de movimientos
  const [movementsReport, setMovementsReport] = useState({
    fromDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    format: 'pdf',
  })

  // Estados para el reporte de cierres
  const [closuresReport, setClosuresReport] = useState({
    fromDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    userId: 'all',
    format: 'pdf',
  })

  // Estados para el reporte financiero
  const [financialReport, setFinancialReport] = useState({
    period: 'month',
    format: 'pdf',
    detail: 'detailed',
  })

  const generateMovementsReport = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        branch_id: currentBranchId,
        format: movementsReport.format,
      }
      // Solo agregar fechas si tienen valor
      if (movementsReport.fromDate) params.from_date = movementsReport.fromDate
      if (movementsReport.toDate) params.to_date = movementsReport.toDate

      const response = await request({
        method: 'GET',
        url: '/cash-registers/reports/movements',
        params,
        responseType: 'blob',
      })

      // Crear un enlace de descarga
      const blob = response instanceof Blob ? response : new Blob([response])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const extension = movementsReport.format === 'pdf' ? 'pdf' :
        movementsReport.format === 'excel' ? 'xlsx' : 'csv'
      link.download = `reporte_movimientos_${movementsReport.fromDate}_${movementsReport.toDate}.${extension}`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      sileo.success({ title: 'Reporte de movimientos generado exitosamente' })
    } catch (error: unknown) {
      console.error('Error generating movements report:', error)
      const message = error instanceof Error ? error.message : 'Error al generar el reporte de movimientos'
      sileo.error({ title: message })
    } finally {
      setIsLoading(false)
    }
  }

  const generateClosuresReport = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        branch_id: currentBranchId,
        format: closuresReport.format,
      }
      // Solo agregar fechas si tienen valor
      if (closuresReport.fromDate) params.from_date = closuresReport.fromDate
      if (closuresReport.toDate) params.to_date = closuresReport.toDate

      if (closuresReport.userId !== 'all') {
        params.user_id = closuresReport.userId
      }

      const response = await request({
        method: 'GET',
        url: '/cash-registers/reports/closures',
        params,
        responseType: 'blob',
      })

      // Crear un enlace de descarga
      const blob = response instanceof Blob ? response : new Blob([response])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const extension = closuresReport.format === 'pdf' ? 'pdf' :
        closuresReport.format === 'excel' ? 'xlsx' : 'csv'
      link.download = `reporte_cierres_${closuresReport.fromDate}_${closuresReport.toDate}.${extension}`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      sileo.success({ title: 'Reporte de cierres generado exitosamente' })
    } catch (error: unknown) {
      console.error('Error generating closures report:', error)
      const message = error instanceof Error ? error.message : 'Error al generar el reporte de cierres'
      sileo.error({ title: message })
    } finally {
      setIsLoading(false)
    }
  }

  const generateFinancialReport = async () => {
    setIsLoading(true)
    try {
      const response = await request({
        method: 'GET',
        url: '/cash-registers/reports/financial',
        params: {
          branch_id: currentBranchId,
          period: financialReport.period,
          format: financialReport.format,
          detail: financialReport.detail,
        },
        responseType: 'blob',
      })

      // Crear un enlace de descarga
      const blob = response instanceof Blob ? response : new Blob([response])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const extension = financialReport.format === 'pdf' ? 'pdf' :
        financialReport.format === 'excel' ? 'xlsx' : 'csv'
      link.download = `reporte_financiero_${financialReport.period}.${extension}`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      sileo.success({ title: 'Reporte financiero generado exitosamente' })
    } catch (error: unknown) {
      console.error('Error generating financial report:', error)
      const message = error instanceof Error ? error.message : 'Error al generar el reporte financiero'
      sileo.error({ title: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Reporte de Movimientos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reporte de Movimientos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detalle de entradas y salidas de efectivo
          </p>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="movements-from">Desde</Label>
                <Input
                  id="movements-from"
                  type="date"
                  value={movementsReport.fromDate}
                  onChange={(e) => setMovementsReport(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="movements-to">Hasta</Label>
                <Input
                  id="movements-to"
                  type="date"
                  value={movementsReport.toDate}
                  onChange={(e) => setMovementsReport(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>
              {(movementsReport.fromDate || movementsReport.toDate) && (
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMovementsReport(prev => ({ ...prev, fromDate: '', toDate: '' }));
                    }}
                    title="Limpiar fechas"
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <Select
                value={movementsReport.format}
                onValueChange={(value) => setMovementsReport(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={generateMovementsReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar Reporte
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Reporte de Cierres */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reporte de Cierres
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Historial de aperturas y cierres de caja
          </p>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="closures-from">Desde</Label>
                <Input
                  id="closures-from"
                  type="date"
                  value={closuresReport.fromDate}
                  onChange={(e) => setClosuresReport(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="closures-to">Hasta</Label>
                <Input
                  id="closures-to"
                  type="date"
                  value={closuresReport.toDate}
                  onChange={(e) => setClosuresReport(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>
              {(closuresReport.fromDate || closuresReport.toDate) && (
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClosuresReport(prev => ({ ...prev, fromDate: '', toDate: '' }));
                    }}
                    title="Limpiar fechas"
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Usuario</Label>
              <Select
                value={closuresReport.userId}
                onValueChange={(value) => setClosuresReport(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  <SelectItem value="1">Admin</SelectItem>
                  <SelectItem value="2">Cajero 1</SelectItem>
                  <SelectItem value="3">Cajero 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <Select
                value={closuresReport.format}
                onValueChange={(value) => setClosuresReport(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={generateClosuresReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar Reporte
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Reporte Financiero */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reporte Financiero
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Análisis de ingresos y egresos por período
          </p>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Período</Label>
              <Select
                value={financialReport.period}
                onValueChange={(value) => setFinancialReport(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Diario</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensual</SelectItem>
                  <SelectItem value="quarter">Trimestral</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <Select
                value={financialReport.format}
                onValueChange={(value) => setFinancialReport(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nivel de Detalle</Label>
              <Select
                value={financialReport.detail}
                onValueChange={(value) => setFinancialReport(prev => ({ ...prev, detail: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Resumen</SelectItem>
                  <SelectItem value="detailed">Detallado</SelectItem>
                  <SelectItem value="full">Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={generateFinancialReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar Reporte
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
