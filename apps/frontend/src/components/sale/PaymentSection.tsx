import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Percent } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, roundToTwoDecimals, calculatePaymentStatus } from '@/utils/sale-calculations'
import type { PaymentMethod } from '@/types/sale'

interface Payment {
  payment_method_id: string
  amount: string
}

interface PaymentSectionProps {
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  total: number
  pendingAmount?: number
  onAddPayment: () => void
  onRemovePayment: (index: number) => void
  onUpdatePayment: (index: number, field: string, value: string) => void
  hasCurrentAccountPayment: boolean
  hasSelectedCustomer: boolean
  isMainPaymentCash?: boolean
}

export function PaymentSection({
  payments,
  paymentMethods,
  total,
  pendingAmount,
  onAddPayment,
  onRemovePayment,
  onUpdatePayment,
  hasCurrentAccountPayment,
  hasSelectedCustomer,
  isMainPaymentCash = false,
}: PaymentSectionProps) {
  const paid = payments.reduce((sum, p) => {
    return sum + (parseFloat(p.amount || '0') || 0)
  }, 0)

  const diff = pendingAmount !== undefined ? pendingAmount : roundToTwoDecimals(total - paid)
  const paymentStatus = calculatePaymentStatus(total, paid)
  const hasPending = paymentStatus.status === 'pending'
  const hasChange = paymentStatus.status === 'change'
  const isPaid = paymentStatus.status === 'exact'

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {payments.map((payment, idx) => {
          const selectedMethod = paymentMethods.find(pm => pm.id.toString() === payment.payment_method_id)

          return (
            <div key={idx} className="space-y-2">
              <div className="flex gap-2 items-center">
                <Select
                  value={payment.payment_method_id}
                  onValueChange={val => onUpdatePayment(idx, 'payment_method_id', val)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id.toString()}>
                        <div className="flex items-center gap-2">
                          {pm.name}
                          {(pm.discount_percentage || 0) > 0 && (
                            <Badge variant="secondary" className="ml-1 gap-1 text-xs">
                              <Percent className="h-2.5 w-2.5" />
                              {pm.discount_percentage}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  value={payment.amount}
                  onChange={e => onUpdatePayment(idx, 'amount', e.target.value)}
                  className="w-32 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                />
                {payments.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => onRemovePayment(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
        <Button variant="outline" onClick={onAddPayment}>
          Agregar método de pago
        </Button>
      </div>

      {/* Payment Status Section */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex justify-between text-base">
          <span className="font-medium">Estado del Pago:</span>
          {hasPending ? (
            <span className="text-red-600 font-bold">Falta {formatCurrency(diff)}</span>
          ) : isPaid ? (
            <span className="text-green-600 font-bold">✓ Pagado Completo</span>
          ) : hasChange && !isMainPaymentCash ? (
            <span className="text-orange-600 font-bold">Monto no coincide</span>
          ) : hasChange && isMainPaymentCash ? (
            <span className="text-blue-600 font-bold">Cambio: {formatCurrency(paymentStatus.amount)}</span>
          ) : (
            <span className="text-gray-600 font-bold">—</span>
          )}
        </div>
      </div>

      {hasCurrentAccountPayment && !hasSelectedCustomer && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p>Para usar "Cuenta Corriente" como método de pago, debes seleccionar un cliente.</p>
        </div>
      )}
    </div>
  )
}

