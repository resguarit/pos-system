import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Coins, CheckCircle, TrendingUp, TrendingDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate, calculatePaymentMethodBreakdown } from "@/utils/cash-register-utils"

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

  const calculatePaymentBreakdown = () => {
    if (!registerToShow) return {}
    
    const opening = parseFloat(registerToShow.initial_amount) || 0
    
    // Obtener el balance esperado del backend si está disponible
    let expectedCashBalance = 0
    
    if (selectedBranchForAction) {
      // Estamos cerrando desde múltiples sucursales
      const registerToClose = multipleCashRegisters?.[selectedBranchForAction]
      expectedCashBalance = registerToClose?.expected_cash_balance ?? 0
    } else {
      // Estamos cerrando desde una sola sucursal
      // Priorizar optimizedCashRegister que tiene el balance calculado del backend
      expectedCashBalance = optimizedCashRegister?.expected_cash_balance ?? 
                           registerToShow?.expected_cash_balance ?? 
                           calculateCashOnlyBalance?.() ?? 0
    }
    
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
    
    // Calcular el desglose desde los movimientos
    const breakdown = calculatePaymentMethodBreakdown(
      movementsToUse, 
      opening, 
      isCashPaymentMethod
    )
    
    // Debug: Log para verificar qué métodos de pago se están detectando
    if (process.env.NODE_ENV === 'development') {
      console.log('Movements to use:', movementsToUse.length)
      console.log('Payment methods found in movements:', movementsToUse.map(m => ({
        id: m.id,
        payment_method: m.payment_method?.name || 'N/A',
        payment_method_id: m.payment_method_id,
        description: m.description
      })))
      console.log('Breakdown calculated:', breakdown)
    }
    
    // Si tenemos el balance esperado del backend (de optimizedCashRegister o del registro),
    // ajustar el efectivo para que coincida con el balance esperado del backend
    // Esto asegura consistencia con el cálculo del backend
    if (optimizedCashRegister?.expected_cash_balance !== undefined || registerToShow?.expected_cash_balance !== undefined) {
      breakdown['Efectivo'] = expectedCashBalance
    }
    
    return breakdown
  }

  const calculateDifference = () => {
    if (!closingForm.closing_balance) return 0
    
    const finalAmount = parseFloat(closingForm.closing_balance) || 0
    let systemBalance = 0
    
    if (selectedBranchForAction) {
      // Estamos cerrando desde múltiples sucursales
      const registerToClose = multipleCashRegisters?.[selectedBranchForAction]
      systemBalance = registerToClose?.expected_cash_balance ?? 0
    } else {
      // Estamos cerrando desde una sola sucursal
      // Priorizar optimizedCashRegister que tiene el balance calculado del backend
      systemBalance = optimizedCashRegister?.expected_cash_balance ?? 
                     registerToShow?.expected_cash_balance ?? 
                     calculateCashOnlyBalance?.() ?? 0
    }
    
    return finalAmount - systemBalance
  }

  const paymentBreakdown = calculatePaymentBreakdown()
  const difference = calculateDifference()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cerrar Caja</DialogTitle>
          <DialogDescription>
            {selectedBranchForAction 
              ? `Cerrar caja para ${branchInfo?.(selectedBranchForAction)?.description || `Sucursal ${selectedBranchForAction}`}`
              : 'Ingresa los detalles para cerrar la caja actual.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Información de Apertura</Label>
            <div className="bg-blue-50 p-3 rounded-md space-y-1">
              {registerToShow && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 font-medium">Caja:</span>
                    <span>{registerToShow.branch?.description || branchInfo?.(selectedBranchForAction || 0)?.description || 'Caja Principal'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 font-medium">Apertura:</span>
                    <span>{formatDate(registerToShow.opened_at)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 font-medium">Operador:</span>
                    <span>{registerToShow.user?.full_name || registerToShow.user?.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 font-medium">Monto Inicial:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(registerToShow.initial_amount) || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Desglose por Método de Pago (Sistema)</Label>
            <div className="bg-gray-50 p-3 rounded-md space-y-2">
              {(() => {
                const breakdownEntries = Object.entries(paymentBreakdown)
                  .sort(([a], [b]) => {
                    if (a === 'Efectivo') return -1
                    if (b === 'Efectivo') return 1
                    return a.localeCompare(b)
                  })
                
                if (breakdownEntries.length === 0) {
                  return (
                    <div className="text-sm text-gray-500 italic">
                      No hay movimientos registrados
                    </div>
                  )
                }
                
                return breakdownEntries.map(([method, amount]) => (
                  <div key={method} className="flex justify-between items-center text-sm">
                    <span className={method === 'Efectivo' ? 'font-semibold text-green-700' : ''}>{method}:</span>
                    <span className={`font-medium ${Math.abs(amount) < 0.01 ? 'text-gray-500' : amount >= 0 ? 'text-green-600' : 'text-red-600'} ${method === 'Efectivo' ? 'font-semibold' : ''}`}>
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
          
          <div className="space-y-2">
            <Label htmlFor="final-amount">Efectivo Contado (Conteo Físico)</Label>
            <Input
              id="final-amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={closingForm.closing_balance}
              onChange={(e) => setClosingForm(prev => ({ ...prev, closing_balance: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" /> Ingresa la cantidad de efectivo que contaste físicamente en la caja
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="closing-notes">Observaciones</Label>
            <Textarea
              id="closing-notes"
              placeholder="Observaciones sobre el cierre de caja"
              value={closingForm.notes}
              onChange={(e) => setClosingForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          {closingForm.closing_balance && (
            <div className="space-y-2">
              <Label>Diferencia de Efectivo</Label>
              <div>
                <p className={`text-sm font-medium ${
                  Math.abs(difference) < 0.01
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
                      Perfecto! El conteo coincide con el sistema
                    </>
                  ) : difference > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      Hay más efectivo del esperado (sobrante)
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      Hay menos efectivo del esperado (faltante)
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
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

