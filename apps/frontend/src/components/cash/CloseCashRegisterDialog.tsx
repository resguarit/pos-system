import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Coins, CheckCircle, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency, formatDate } from "@/utils/cash-register-utils"
import { calculatePaymentMethodTotals } from "./PaymentBreakdownGrid"

interface CloseCashRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseCashRegister: (closingForm: { closing_balance: string; notes: string }) => void
  loading: boolean
  currentRegister?: any
  multipleCashRegisters?: Record<number, any>
  selectedBranchForAction?: number | null
  branchInfo?: (branchId: number) => any
  movements?: any[]
  allMovements?: any[] // Movimientos de todas las sucursales
  calculateCashOnlyBalance?: () => number
  isCashPaymentMethod?: (name: string) => boolean
  optimizedCashRegister?: any // Registro optimizado con expected_cash_balance calculado
}

export const CloseCashRegisterDialog = ({
  open,
  onOpenChange,
  onCloseCashRegister,
  loading,
  currentRegister,
  multipleCashRegisters,
  selectedBranchForAction,
  branchInfo,
  movements = [],
  allMovements = [],
  calculateCashOnlyBalance,
  isCashPaymentMethod,
  optimizedCashRegister
}: CloseCashRegisterDialogProps) => {
  const [closingForm, setClosingForm] = useState({
    closing_balance: '',
    notes: '',
  })

  const handleClose = () => {
    setClosingForm({ closing_balance: '', notes: '' })
    onOpenChange(false)
  }

  // Determinar qué caja mostrar: múltiples sucursales o una sola
  const registerToShow = selectedBranchForAction
    ? multipleCashRegisters?.[selectedBranchForAction]
    : currentRegister

  const getSystemBalance = () => {
    if (selectedBranchForAction) {
      // Estamos cerrando desde múltiples sucursales
      const registerToClose = multipleCashRegisters?.[selectedBranchForAction]
      return registerToClose?.expected_cash_balance ?? 0
    } else {
      // Estamos cerrando desde una sola sucursal
      // Priorizar optimizedCashRegister que tiene el balance calculado del backend
      return optimizedCashRegister?.expected_cash_balance ??
        registerToShow?.expected_cash_balance ??
        calculateCashOnlyBalance?.() ?? 0
    }
  }

  const calculatePaymentBreakdown = () => {
    if (!registerToShow) return {}

    const opening = parseFloat(registerToShow.initial_amount) || 0
    const expectedCashBalance = getSystemBalance()

    // Determinar qué movimientos usar
    // Priorizar allMovements si está disponible (tiene todos los movimientos, no solo los paginados)
    let movementsToUse = allMovements.length > 0 ? allMovements : movements

    if (selectedBranchForAction && movementsToUse.length > 0) {
      movementsToUse = movementsToUse.filter(movement => {
        return movement.cash_register_id === registerToShow.id
      })
    } else if (!selectedBranchForAction && allMovements.length > 0) {
      // Para una sola sucursal, filtrar por cash_register_id si allMovements tiene datos de múltiples cajas
      movementsToUse = allMovements.filter(movement => {
        return movement.cash_register_id === registerToShow?.id
      })
    }

    // Usar la misma lógica que el Grid del Dashboard para consistencia
    const totals = calculatePaymentMethodTotals(movementsToUse)
    const breakdown: Record<string, number> = {}

    // Agrupar por nombre (el dashboard grid lo hace por ID, pero aquí mostramos lista por nombre)
    totals.forEach(t => {
      breakdown[t.name] = (breakdown[t.name] || 0) + t.total
    })

    // Sumar saldo inicial a Efectivo
    // Asumimos que 'Efectivo' es el nombre standard. Si viene con otro nombre del backend (ej: "Contado"),
    // la lógica de calculatePaymentMethodTotals usará ese nombre.
    // Intentamos detectar si hay un método que sea efectivo
    const cashMethodName = totals.find(t => isCashPaymentMethod?.(t.name) || t.name === 'Efectivo')?.name || 'Efectivo'

    // breakdown[cashMethodName] = (breakdown[cashMethodName] || 0) + opening
    // We now keep breakdown purely as "Flow" (movements) to match the dashboard.

    // Debug
    if (process.env.NODE_ENV === 'development') {
      console.log('CloseCashRegisterDialog - Totals matching dashboard:', totals)
      console.log('CloseCashRegisterDialog - Breakdown (Flow only):', breakdown)
    }

    return breakdown
  }

  // Helper to get movements used for calculation (duplicated logic for consistency, could be refactored)
  const getMovementsToUse = () => {
    let movementsToUse = allMovements.length > 0 ? allMovements : movements
    if (selectedBranchForAction && movementsToUse.length > 0) {
      return movementsToUse.filter(m => m.cash_register_id === registerToShow?.id)
    } else if (!selectedBranchForAction && allMovements.length > 0) {
      return movementsToUse.filter(m => m.cash_register_id === registerToShow?.id)
    }
    return movementsToUse
  }

  const movementsForStats = getMovementsToUse()
  const cashMovements = movementsForStats.filter(m => isCashPaymentMethod?.(m.payment_method?.name || 'Efectivo') || m.payment_method?.name === 'Efectivo')
  const cashIncome = cashMovements.filter(m => m.amount > 0).reduce((sum, m) => sum + parseFloat(m.amount), 0)
  const cashExpense = cashMovements.filter(m => m.amount < 0).reduce((sum, m) => sum + parseFloat(m.amount), 0)

  const calculateDifference = () => {
    if (!closingForm.closing_balance) return 0

    const countedCash = parseFloat(closingForm.closing_balance) || 0
    const breakdown = calculatePaymentBreakdown()
    const initialAmount = parseFloat(registerToShow?.initial_amount) || 0

    // Nueva lógica:
    // Efectivo en sistema = Inicial + Flujo de Efectivo
    const cashFlow = breakdown['Efectivo'] || 0
    const expectedCashValue = initialAmount + cashFlow

    // Diferencia = Efectivo Contado - Total Esperado
    return countedCash - expectedCashValue
  }

  const paymentBreakdown = calculatePaymentBreakdown()
  const difference = calculateDifference()
  const systemBalance = getSystemBalance()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cerrar Caja</DialogTitle>
          <DialogDescription>
            {selectedBranchForAction
              ? `Cerrar caja para ${branchInfo?.(selectedBranchForAction)?.description || `Sucursal ${selectedBranchForAction}`}`
              : 'Ingresa los detalles para cerrar la caja actual.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Alerta de saldo negativo - Ancho completo */}
          {systemBalance < 0 && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 mb-6">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-xs">
                <strong>Atención:</strong> El sistema registra un saldo negativo ({formatCurrency(systemBalance)}).
                Esto indica que los gastos superan a los ingresos registrados.
                La diferencia de efectivo se calculará sumando el dinero físico a este saldo negativo para compensarlo.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Información del Sistema */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Información de Apertura</Label>
                <div className="bg-blue-50 p-3 rounded-md space-y-1 border border-blue-100">
                  {registerToShow && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Caja:</span>
                        <span className="text-right">{registerToShow.branch?.description || branchInfo?.(selectedBranchForAction || 0)?.description || 'Caja Principal'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Apertura:</span>
                        <span className="text-right">{formatDate(registerToShow.opened_at)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Operador:</span>
                        <span className="text-right">{registerToShow.user?.full_name || registerToShow.user?.username || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Otros Métodos de Pago</Label>
                <div className="bg-gray-50 p-3 rounded-md space-y-2 border border-gray-200">
                  {(() => {
                    const breakdownEntries = Object.entries(paymentBreakdown)
                      .filter(([method]) => method !== 'Efectivo') // Excluir Efectivo de esta lista
                      .sort(([a], [b]) => a.localeCompare(b))

                    if (breakdownEntries.length === 0) {
                      return (
                        <div className="text-sm text-gray-500 italic">
                          No hay otros movimientos
                        </div>
                      )
                    }

                    return breakdownEntries.map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center text-sm">
                        <span className="font-medium">
                          {method}:
                        </span>
                        <span className={`font-medium ${Math.abs(amount) < 0.01 ? 'text-gray-500' : amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(amount) < 0.01
                            ? formatCurrency(0)
                            : amount >= 0
                              ? formatCurrency(amount)
                              : `-${formatCurrency(Math.abs(amount))}`
                          }
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Nueva sección: Balance de Efectivo */}
              <div className="space-y-2">
                <Label className="text-primary font-semibold">Balance de Efectivo (Objetivo)</Label>
                <div className="bg-slate-50 p-3 rounded-md space-y-2 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Saldo Inicial:</span>
                    <span className="text-right font-medium text-slate-700">{formatCurrency(parseFloat(registerToShow?.initial_amount) || 0)}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-1 pt-1 space-y-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Ingresos Efectivo:</span>
                      <span className="text-green-600">+{formatCurrency(cashIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Egresos Efectivo:</span>
                      <span className="text-red-600">{formatCurrency(cashExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Flujo Neto Efectivo:</span>
                      <span className={`text-right font-medium ${(paymentBreakdown['Efectivo'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(paymentBreakdown['Efectivo'] || 0) >= 0 ? '+' : ''}{formatCurrency(paymentBreakdown['Efectivo'] || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 my-1 pt-2 flex justify-between items-center text-base">
                    <span className="font-bold text-slate-800">Debe haber en caja:</span>
                    <span className="font-bold text-right text-lg text-slate-900">
                      {formatCurrency((parseFloat(registerToShow?.initial_amount) || 0) + (paymentBreakdown['Efectivo'] || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Acciones del Usuario */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="final-amount" className="text-base font-semibold text-primary">
                  Efectivo Contado (Conteo Físico)
                </Label>
                <Input
                  id="final-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={closingForm.closing_balance}
                  onChange={(e) => setClosingForm(prev => ({ ...prev, closing_balance: e.target.value }))}
                  className="text-lg h-12"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Ingresa la cantidad de efectivo que contaste físicamente en la caja
                </p>
              </div>

              {closingForm.closing_balance && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <Label>Diferencia de Efectivo</Label>
                  <div>
                    <p className={`text-lg font-bold ${Math.abs(difference) < 0.01
                      ? 'text-blue-600'
                      : difference > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                      }`}>
                      {formatCurrency(difference)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {Math.abs(difference) < 0.01 ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          Perfecto! Coincide con el sistema
                        </>
                      ) : difference > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          Sobrante
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          Faltante
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="closing-notes">Observaciones</Label>
                <Textarea
                  id="closing-notes"
                  placeholder="Observaciones sobre el cierre de caja"
                  value={closingForm.notes}
                  onChange={(e) => setClosingForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onCloseCashRegister(closingForm)
              handleClose()
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Cerrar Caja'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
