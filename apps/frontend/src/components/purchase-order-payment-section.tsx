import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, AlertTriangle, Plus } from "lucide-react"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'
import type { PaymentMethod } from '@/lib/api/paymentMethodService'

export interface PurchaseOrderPaymentState {
    payment_method_id: string
    amount: string
}

interface PurchaseOrderPaymentSectionProps {
    payments: PurchaseOrderPaymentState[]
    paymentMethods: PaymentMethod[]
    total: number
    onAddPayment: () => void
    onRemovePayment: (index: number) => void
    onUpdatePayment: (index: number, field: keyof PurchaseOrderPaymentState, value: string) => void
    readOnly?: boolean
}

export function PurchaseOrderPaymentSection({
    payments,
    paymentMethods,
    total,
    onAddPayment,
    onRemovePayment,
    onUpdatePayment,
    readOnly = false,
}: PurchaseOrderPaymentSectionProps) {
    const paid = payments.reduce((sum, p) => {
        return sum + (parseFloat(p.amount || '0') || 0)
    }, 0)

    const diff = roundToTwoDecimals(total - paid)
    const isExact = Math.abs(diff) < 0.01
    const isShort = diff > 0.01
    const isOver = diff < -0.01

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                {!readOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={onAddPayment}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar método
                    </Button>
                )}
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
                {payments.map((payment, idx) => {
                    return (
                        <div key={idx} className="flex gap-3 items-center">
                            <div className="flex-1">
                                <Select
                                    value={payment.payment_method_id}
                                    onValueChange={val => onUpdatePayment(idx, 'payment_method_id', val)}
                                    disabled={readOnly}
                                >
                                    <SelectTrigger disabled={readOnly}>
                                        <SelectValue placeholder="Método de pago" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((pm) => (
                                            <SelectItem key={pm.id} value={pm.id.toString()}>
                                                {pm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-40">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Monto"
                                    value={payment.amount}
                                    onChange={e => onUpdatePayment(idx, 'amount', e.target.value)}
                                    className="text-right font-medium"
                                    disabled={readOnly}
                                />
                            </div>
                            {payments.length > 1 && !readOnly && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-red-500"
                                    onClick={() => onRemovePayment(idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )
                })}

                {payments.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No hay pagos registrados. Agrega al menos uno.
                    </div>
                )}
            </div>

            {/* Summary / Status */}
            <div className="flex justify-between items-center px-2">
                <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total Orden: <span className="font-medium text-foreground">{formatCurrency(total)}</span></div>
                    <div className="text-sm text-muted-foreground">Total Pagos: <span className="font-medium text-foreground">{formatCurrency(paid)}</span></div>
                </div>

                <div className="text-right">
                    {isExact ? (
                        <div className="text-green-600 font-bold flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                            <span>✓ Pagos Completos</span>
                        </div>
                    ) : isShort ? (
                        <div className="text-red-600 font-bold flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Falta: {formatCurrency(diff)}</span>
                        </div>
                    ) : (
                        <div className="text-orange-600 font-bold flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Excede: {formatCurrency(Math.abs(diff))}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
