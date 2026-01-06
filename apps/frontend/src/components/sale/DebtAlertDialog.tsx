import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, DollarSign, ExternalLink } from "lucide-react"
import api from "@/lib/api"
import type { PendingSale } from '@/types/currentAccount'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePermissions } from "@/hooks/usePermissions"

interface DebtAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number | null
  debtAmount: number | null
  onPaymentSuccess?: () => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function DebtAlertDialog({
  open,
  onOpenChange,
  customerId,
  debtAmount,

}: DebtAlertDialogProps) {
  const { hasPermission } = usePermissions()
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)



  // Cargar ventas pendientes
  useEffect(() => {
    if (!open || !customerId) {
      setPendingSales([])
      return
    }

    const loadPendingSales = async () => {
      try {
        setLoading(true)
        // Obtener cuenta corriente del cliente
        const accountResponse = await api.get(
          `/current-accounts?customer_id=${customerId}&per_page=1`
        )

        if (!accountResponse.data.data || accountResponse.data.data.length === 0) {
          return
        }

        const account = accountResponse.data.data[0]

        // Obtener ventas pendientes
        const salesResponse = await api.get(
          `/current-accounts/${account.id}/pending-sales`
        )

        setPendingSales(salesResponse.data.data || [])
      } catch (error) {
        console.error('Error loading pending sales:', error)
        setPendingSales([])
      } finally {
        setLoading(false)
      }
    }

    loadPendingSales()
  }, [open, customerId])

  const handleContinueSale = () => {
    onOpenChange(false)
  }

  const handleGoToAccounts = () => {
    if (!customerId) return
    const url = `/dashboard/clientes/${customerId}/cuenta-corriente`
    window.open(url, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cliente con Deuda
          </DialogTitle>
          <DialogDescription>
            Este cliente tiene saldo pendiente en su cuenta corriente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alerta principal con deuda total */}
          <Alert className="border-red-200 bg-red-50">
            <DollarSign className="h-4 w-4 text-red-600" />
            <AlertTitle>Saldo Adeudado</AlertTitle>
            <AlertDescription className="text-lg font-bold text-red-900 mt-2">
              {formatCurrency(debtAmount || 0)}
            </AlertDescription>
          </Alert>

          {/* Detalles de ventas pendientes (expandible) */}
          {!loading && pendingSales.length > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full text-sm font-medium hover:text-blue-600 transition"
              >
                <span>Ver {pendingSales.length} venta(s) pendiente(s)</span>
                <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {expanded && (
                <div className="mt-3 overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venta #</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">#{sale.id}</TableCell>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.paid_amount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(sale.pending_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center text-sm text-gray-500 py-4">
              Cargando ventas pendientes...
            </div>
          )}

          {/* Opciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p className="font-medium mb-2">¿Qué deseas hacer?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Continuar con la venta actual y pagar después</li>
              <li>Ir a Cuentas Corrientes para gestionar el pago completo</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          {hasPermission('gestionar_cuentas_corrientes') && (
            <Button
              variant="outline"
              onClick={handleGoToAccounts}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ir a Cuentas Corrientes
            </Button>
          )}
          <Button
            onClick={handleContinueSale}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continuar con Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
