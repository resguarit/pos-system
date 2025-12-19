import { describe, it, expect } from 'vitest'
import { calculatePaymentDiscount, type DiscountablePayment, type DiscountableMethod } from './sale-calculations'

describe('calculatePaymentDiscount', () => {
    const methods: DiscountableMethod[] = [
        { id: '1', discount_percentage: 0 }, // Efectivo sin descuento
        { id: '2', discount_percentage: 10 }, // Efectivo 10% off
        { id: '3', discount_percentage: 20 }, // Otro metodo
    ]

    it('should apply discount to full payment with single method', () => {
        // Total 1000, 10% off method, full payment
        const total = 1000
        const payments: DiscountablePayment[] = [
            // user enters 1000 or empty? 
            // Logic says: explicit amount is used. If empty, it's open.
            // If single row and empty, it covers full amount?
            // Wait, frontend usually initializes with amount='', but user fills it or not.
            // If amount='10000', discount is 1000.
            { payment_method_id: '2', amount: '1000' }
        ]

        // Explicit 1000 * 10% = 100.
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(100)
    })

    it('should apply discount to remainder if amount is empty', () => {
        // Total 1000. Payment method with 10% off. Amount empty (open).
        // Explicit paid = 0. Remainder = 1000.
        // 1000 * 10% = 100.
        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '' }
        ]
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(100)
    })

    it('should split payment: 50% cash (no discount) explicit, 50% discount method (open)', () => {
        // Total 1000.
        // Pay 500 with ID 1 (0% off).
        // Remainder 500 with ID 2 (10% off) (open).

        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '1', amount: '500' },
            { payment_method_id: '2', amount: '' }
        ]

        // Explicit 1: 500 * 0% = 0.
        // Explicit 2: 0 (empty).
        // Total Explicit: 500.
        // Remainder: 1000 - 500 = 500.

        // Open methods: ID 2 (10%).
        // Discount on remainder: 500 * 10% = 50.

        expect(calculatePaymentDiscount(total, payments, methods)).toBe(50)
    })

    it('should split payment: 50% discount method explicit, 50% other (open)', () => {
        // Total 1000.
        // Pay 500 with ID 2 (10% off).
        // Remainder 500 with ID 1 (0% off) (open).

        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '500' },
            { payment_method_id: '1', amount: '' }
        ]

        // Explicit: 500 with 10% -> 50 discount.
        // Remainder: 500.
        // Open method ID 1 has 0% discount.
        // Total discount = 50.

        expect(calculatePaymentDiscount(total, payments, methods)).toBe(50)
    })

    it('should calculate mixed explicit amounts correctly', () => {
        // Total 2000
        // 1. Pay 500 with 10% (ID 2) -> 50 discount
        // 2. Pay 500 with 20% (ID 3) -> 100 discount
        // 3. Remainder 1000 with 0% (ID 1 - open) -> 0 discount

        const total = 2000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '500' },
            { payment_method_id: '3', amount: '500' },
            { payment_method_id: '1', amount: '' }
        ]

        expect(calculatePaymentDiscount(total, payments, methods)).toBe(150)
    })

    it('should handle open remainder with BEST discount available', () => {
        // Total 1000.
        // Explicit: 0.
        // Open A: 10%
        // Open B: 20%
        // Logic: If multiple open, we don't know which one covers how much.
        // Current heuristic: Apply MAX rate to the FULL remainder.

        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '' },
            { payment_method_id: '3', amount: '' }
        ]

        // Should choose 20% (ID 3).
        // 1000 * 20% = 200.
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(200)
    })

    it('should return 0 if no methods selected', () => {
        expect(calculatePaymentDiscount(1000, [], methods)).toBe(0)
    })

    it('should handle underpayment (remainder > 0 but no open methods)', () => {
        // Total 1000.
        // Pay 500 with 10%.
        // No other rows.

        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '500' }
        ]

        // Discount: 50.
        // Remainder exists but no open method to cover it.
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(50)
    })
})
