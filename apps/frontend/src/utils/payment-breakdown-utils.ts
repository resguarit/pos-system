import type { CashMovement } from "@/types/cash-register.types"

// Type definition for payment method totals (moved from PaymentBreakdownGrid)
export interface PaymentMethodTotal {
    id: number
    name: string
    income: number
    expense: number
    total: number
}

/**
 * Filters movements that affect the cash balance.
 * Movements with affects_balance === false are excluded (informational only).
 * @param movements - Array of cash movements
 * @returns Filtered array of movements that affect balance
 */
function filterAffectingMovements(movements: CashMovement[]): CashMovement[] {
    return movements.filter((movement) => movement.affects_balance !== false)
}

/**
 * Determines if a movement is an income (entrada) or expense (salida).
 * @param movement - Cash movement to check
 * @returns true if income, false if expense
 */
function isIncomeMovement(movement: CashMovement): boolean {
    const movementType = movement.movement_type
    return (
        movementType?.operation_type === "entrada" ||
        movementType?.is_income === true
    )
}

/**
 * Calculates payment method totals from a list of movements.
 * 
 * This function:
 * 1. Filters out movements that don't affect the cash balance (affects_balance === false)
 * 2. Groups movements by payment method
 * 3. Calculates income, expense, and net total for each payment method
 * 
 * @param movements - Array of cash movements (typed as CashMovement[] or any[] for compatibility)
 * @returns Array of PaymentMethodTotal objects sorted by payment method
 * 
 * @example
 * const totals = calculatePaymentMethodTotals(movements)
 * // Returns: [{ id: 1, name: "Efectivo", income: 1000, expense: 500, total: 500 }, ...]
 */
export function calculatePaymentMethodTotals(movements: CashMovement[] | Partial<CashMovement>[]): PaymentMethodTotal[] {
    if (!movements || movements.length === 0) {
        return []
    }

    // Filter out movements that don't affect balance (informational only)
    const affectingMovements = filterAffectingMovements(movements as CashMovement[])

    const totals: Record<number, PaymentMethodTotal> = {}

    affectingMovements.forEach((movement) => {
        const paymentMethodId = movement.payment_method_id ?? 0
        const paymentMethodName = movement.payment_method?.name ?? "Sin especificar"
        const amount = Math.abs(parseFloat(String(movement.amount)) || 0)
        const isIncome = isIncomeMovement(movement)

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
