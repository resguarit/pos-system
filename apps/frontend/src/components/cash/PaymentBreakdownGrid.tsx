import { Wallet } from "lucide-react"

// Type definition for payment method totals
export interface PaymentMethodTotal {
    id: number
    name: string
    income: number
    expense: number
    total: number
}

interface PaymentBreakdownGridProps {
    paymentMethodTotals: PaymentMethodTotal[]
    formatCurrency: (amount: number) => string
    title?: string
    showTitle?: boolean
    compact?: boolean
}

/**
 * PaymentBreakdownGrid - Reusable component for displaying payment method breakdown
 * Shows individual cards for each payment method and a Total General summary card
 */
export function PaymentBreakdownGrid({
    paymentMethodTotals,
    formatCurrency,
    title = "Desglose por Método de Pago",
    showTitle = true,
    compact = false,
}: PaymentBreakdownGridProps) {
    if (!paymentMethodTotals || paymentMethodTotals.length === 0) {
        return null
    }

    // Calculate totals across all payment methods
    const totalIncome = paymentMethodTotals.reduce((sum, pm) => sum + pm.income, 0)
    const totalExpense = paymentMethodTotals.reduce((sum, pm) => sum + pm.expense, 0)
    const totalNet = totalIncome - totalExpense

    const textSize = compact ? "text-xs" : "text-sm"

    return (
        <div className={compact ? "" : "bg-gray-50 rounded-lg p-4 border"}>
            {showTitle && (
                <h4 className={`font-semibold text-gray-700 ${compact ? "mb-2" : "mb-3"} flex items-center gap-2`}>
                    <Wallet className="h-4 w-4 text-blue-600" />
                    {title}
                </h4>
            )}
            <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3`}>
                {/* Individual Payment Method Cards */}
                {paymentMethodTotals.map((pm) => (
                    <div
                        key={pm.id}
                        className={`bg-white rounded-lg p-3 border ${compact ? "" : "shadow-sm"}`}
                    >
                        <div className={`font-medium text-gray-900 ${textSize}`}>{pm.name}</div>
                        <div className={`text-green-600 ${textSize}`}>+{formatCurrency(pm.income)}</div>
                        {pm.expense > 0 && (
                            <div className={`text-red-600 ${textSize}`}>-{formatCurrency(pm.expense)}</div>
                        )}
                        <div className={`font-semibold border-t mt-1 pt-1 ${textSize}`}>
                            {formatCurrency(pm.total)}
                        </div>
                    </div>
                ))}

                {/* Total General Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
                    <div className={`font-bold text-white flex items-center gap-1 ${textSize}`}>
                        <Wallet className="h-4 w-4 text-yellow-300" /> Total General
                    </div>
                    <div className={`text-blue-100 ${textSize}`}>
                        Ingresos: +{formatCurrency(totalIncome)}
                    </div>
                    <div className={`text-blue-100 ${textSize}`}>
                        Egresos: -{formatCurrency(totalExpense)}
                    </div>
                    <div className={`font-bold border-t border-blue-400 mt-1 pt-1 ${compact ? "" : "text-lg"}`}>
                        Neto: {formatCurrency(totalNet)}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Utility function to calculate payment method totals from a list of movements
 * @param movements - Array of cash movements
 * @returns Array of PaymentMethodTotal objects
 */
export function calculatePaymentMethodTotals(movements: any[]): PaymentMethodTotal[] {
    if (!movements || movements.length === 0) {
        return []
    }

    const totals: Record<number, PaymentMethodTotal> = {}

    movements.forEach((movement) => {
        const paymentMethodId = movement.payment_method_id ?? 0
        const paymentMethodName = movement.payment_method?.name ?? "Sin especificar"
        const amount = parseFloat(movement.amount) || 0
        const movementType = movement.movement_type
        const isIncome =
            movementType?.operation_type === "entrada" || movementType?.is_income === true

        if (!totals[paymentMethodId]) {
            totals[paymentMethodId] = {
                id: paymentMethodId,
                name: paymentMethodName,
                income: 0,
                expense: 0,
                total: 0,
            }
        }

        if (isIncome) {
            totals[paymentMethodId].income += amount
        } else {
            totals[paymentMethodId].expense += amount
        }
        totals[paymentMethodId].total =
            totals[paymentMethodId].income - totals[paymentMethodId].expense
    })

    return Object.values(totals)
}

export default PaymentBreakdownGrid
