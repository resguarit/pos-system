/**
 * Calculates the monthly normalized cost of a service based on its billing cycle.
 * @param amount - The raw amount of the service cost
 * @param billingCycle - The billing cycle (monthly, quarterly, annual, one_time)
 * @returns The normalized monthly cost
 */
export const calculateMonthlyCost = (amount: string | number, billingCycle: string): number => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(value)) return 0

    switch (billingCycle) {
        case 'monthly':
            return value
        case 'quarterly':
            return value / 3
        case 'annual':
            return value / 12
        case 'biennial':
            return value / 24
        case 'one_time':
        default:
            return 0
    }
}
