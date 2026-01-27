import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, AlertTriangle, Plus } from "lucide-react"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'
import type { PaymentMethod } from '@/lib/api/paymentMethodService'

/** Tolerancia para validar que el total de pagos coincida con el total de la orden (evita fallos por redondeo). */
export const PAYMENT_VALIDATION_TOLERANCE = 0.05;

/** Umbral interno para considerar "pago exacto" en la UI. */
const PAYMENT_EXACT_THRESHOLD = 0.01;

export interface PurchaseOrderPaymentState {
    payment_method_id: string
    amount: string
}

interface PurchaseOrderPaymentSectionProps {
    payments: PurchaseOrderPaymentState[]
    paymentMethods: PaymentMethod[]
    /** Total de la orden en la moneda de la orden (ARS o USD) */
    total: number
    /** Moneda de la orden */
    currency?: 'ARS' | 'USD'
    /** Tasa USD → ARS. Requerida cuando currency === 'USD' para mostrar el equivalente en pesos */
    exchangeRate?: number | null
    onAddPayment: () => void
    onRemovePayment: (index: number) => void
    onUpdatePayment: (index: number, field: keyof PurchaseOrderPaymentState, value: string) => void
    readOnly?: boolean
}

export function PurchaseOrderPaymentSection({
    payments,
    paymentMethods,
    total,
    currency = 'ARS',
    exchangeRate = null,
    onAddPayment,
    onRemovePayment,
    onUpdatePayment,
    readOnly = false,
}: PurchaseOrderPaymentSectionProps) {
    // Siempre mostramos y cobramos en ARS: los montos que ingresa el usuario son en ARS.
    // Si la orden es en USD y hay tasa, convertimos; si no hay tasa válida, mostramos el total sin convertir (evita NaN).
    const hasValidRate = Boolean(exchangeRate && exchangeRate > 0);
    const rate = typeof exchangeRate === 'number' && exchangeRate > 0 ? exchangeRate : 0;
    const totalArs = currency === 'USD' && hasValidRate
        ? roundToTwoDecimals(total * rate)
        : total;
    const isRatePending = currency === 'USD' && !hasValidRate;

    const paid = payments.reduce((sum, p) => {
        return sum + (parseFloat(p.amount || '0') || 0)
    }, 0)

    const diff = roundToTwoDecimals(totalArs - paid)
    const isExact = Math.abs(diff) < PAYMENT_EXACT_THRESHOLD
    const isShort = diff > PAYMENT_EXACT_THRESHOLD
    const isOver = diff < -PAYMENT_EXACT_THRESHOLD

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
                                    placeholder="Monto (ARS)"
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

            {/* Resumen en ARS (siempre se paga en pesos) */}
            <div className="space-y-1 px-2 pt-1">
                <p className="text-xs text-muted-foreground">Los montos se ingresan en ARS (pesos argentinos).</p>
            </div>
            <div className="flex justify-between items-center px-2">
                <div className="space-y-1">
                    <div className="text-sm">
                        <span className="text-muted-foreground">Total Orden: </span>
                        <span className="font-semibold text-foreground">{formatCurrency(totalArs, 'ARS')}</span>
                        {currency === 'USD' && hasValidRate && (
                            <span className="text-xs text-muted-foreground ml-1">(equiv. {formatCurrency(total, 'USD')})</span>
                        )}
                        {isRatePending && (
                            <span className="text-xs text-amber-600 ml-1">(cargando tasa USD→ARS…)</span>
                        )}
                    </div>
                    <div className="text-sm">
                        <span className="text-muted-foreground">Total Pagos: </span>
                        <span className="font-semibold text-foreground">{formatCurrency(paid, 'ARS')}</span>
                    </div>
                </div>

                <div className="text-right">
                    {isExact ? (
                        <div className="text-green-600 font-bold flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                            <span>✓ Pagos Completos</span>
                        </div>
                    ) : isShort ? (
                        <div className="text-red-600 font-bold flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Falta: {formatCurrency(diff, 'ARS')}</span>
                        </div>
                    ) : isOver ? (
                        <div className="text-orange-600 font-bold flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Excede: {formatCurrency(Math.abs(diff), 'ARS')}</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
