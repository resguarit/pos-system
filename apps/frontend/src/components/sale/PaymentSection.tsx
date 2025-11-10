import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Trash2 } from "lucide-react"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'
import type { PaymentMethod } from '@/types/sale'

interface Payment {
  payment_method_id: string
  amount: string
}

interface PaymentSectionProps {
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  total: number
  onAddPayment: () => void
  onRemovePayment: (index: number) => void
  onUpdatePayment: (index: number, field: string, value: string) => void
  hasCurrentAccountPayment: boolean
  hasSelectedCustomer: boolean
}

export function PaymentSection({
  payments,
  paymentMethods,
  total,
  onAddPayment,
  onRemovePayment,
  onUpdatePayment,
  hasCurrentAccountPayment,
  hasSelectedCustomer,
}: PaymentSectionProps) {
  const paid = payments.reduce((sum, p) => {
    return sum + (parseFloat(p.amount || '0') || 0)
  }, 0)
  const diff = roundToTwoDecimals(total - paid)

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {payments.map((payment, idx) => (
          <div key={idx} className="flex gap-2 items-center">
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
                    {pm.name}
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
              className="w-32"
            />
            {payments.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => onRemovePayment(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" onClick={onAddPayment}>
          Agregar método de pago
        </Button>
      </div>
      
      <div className="flex justify-between text-base">
        <span>Falta:</span>
        <span className={diff > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
          {formatCurrency(Math.max(0, diff))}
        </span>
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


