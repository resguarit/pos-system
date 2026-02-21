import { describe, it, expect } from 'vitest'
import {
    calculatePaymentDiscount,
    calculateSaleTotals,
    normalizePaymentsForFinalTotal,
    type DiscountablePayment,
    type DiscountableMethod,
    type PaymentMethodLike,
    type SalePaymentInput,
} from './sale-calculations'
import type { CartItem } from '@/types/combo'

// Helper to create test cart items with required fields
const createTestCartItem = (overrides: Partial<CartItem> & Pick<CartItem, 'id' | 'price' | 'sale_price' | 'iva_rate'>): CartItem => ({
    code: '',
    name: '',
    price_with_iva: 0,
    quantity: 1,
   image: '',
    currency: 'ARS',
    ...overrides
})

describe('calculateSaleTotals - allow_discount flag', () => {
    it('should block item discount when allow_discount is false', () => {
        const items: CartItem[] = [
            createTestCartItem({
                id: '1',
                product_id: 1,
                price: 100,
                price_with_iva: 121,
                sale_price: 100,
                iva_rate: 21,
                discount_type: 'percent' as const,
                discount_value: 10,
                allow_discount: false,
            })
        ]

        const totals = calculateSaleTotals(items, { type: '', value: '' })

        // Discount should be ignored
        expect(totals.totalItemDiscount).toBe(0)
        expect(totals.subtotalNet).toBe(100)
        expect(totals.totalIva).toBe(21)
        expect(totals.total).toBe(121)
    })

    it('should apply item discount when allow_discount is true', () => {
        const items: CartItem[] = [
            createTestCartItem({
                id: '1',
                product_id: 1,
                price: 100,
                price_with_iva: 121,
                sale_price: 100,
                iva_rate: 21,
                discount_type: 'percent' as const,
                discount_value: 10,
                allow_discount: true,
            })
        ]

        const totals = calculateSaleTotals(items, { type: '', value: '' })

        // Discount should be applied: 10% of 100 = 10
        expect(totals.totalItemDiscount).toBe(10)
        // Subtotal after discount: 100 - 10 = 90
        expect(totals.subtotalNet).toBe(90)
        // IVA on 90: 18.90
        expect(totals.totalIva).toBe(18.90)
        // Total: 90 + 18.90 = 108.90
        expect(totals.total).toBe(108.90)
    })

    it('should handle mixed products with different allow_discount flags', () => {
        const items: CartItem[] = [
            createTestCartItem({
                id: '1',
                product_id: 1,
                price: 260000,
                price_with_iva: 314600,
                sale_price: 260000,
                iva_rate: 21,
                discount_type: 'percent' as const,
                discount_value: 10,
                allow_discount: false,
            }),
            createTestCartItem({
                id: '2',
                product_id: 2,
                price: 100,
                price_with_iva: 121,
                sale_price: 100,
                iva_rate: 21,
                discount_type: 'percent' as const,
                discount_value: 10,
                allow_discount: true,
            })
        ]

        const totals = calculateSaleTotals(items, { type: '', value: '' })

        // Only Vasito discount applied: 10% of 100 = 10
        expect(totals.totalItemDiscount).toBe(10)
        
        // Subtotal: 260000 (no disc) + 90 (after disc) = 260090
        expect(totals.subtotalNet).toBe(260090)
        
        // IVA: 260000*0.21 + 90*0.21 = 54600 + 18.90 = 54618.90
        expect(totals.totalIva).toBe(54618.90)
        
        // Total: 260090 + 54618.90 = 314708.90
        expect(totals.total).toBe(314708.90)
    })

    it('should exclude non-discountable products from global discount base', () => {
        const items: CartItem[] = [
            createTestCartItem({
                id: '1',
                product_id: 1,
                price: 1000,
                price_with_iva: 1000,
                sale_price: 1000,
                iva_rate: 0,
                allow_discount: false,
            }),
            createTestCartItem({
                id: '2',
                product_id: 2,
                price: 100,
                price_with_iva: 100,
                sale_price: 100,
                iva_rate: 0,
                allow_discount: true,
            })
        ]

        // Apply 10% global discount
        const totals = calculateSaleTotals(items, { type: 'percent', value: '10' })

        // Global discount should only apply to discountable products
        // Only 100 is discountable, 10% of 100 = 10
        expect(totals.globalDiscountAmount).toBe(10)
        
        // Total: 1000 + 100 - 10 = 1090
        expect(totals.total).toBe(1090)
    })

    it('should exclude non-discountable products from payment discount base', () => {
        const items: CartItem[] = [
            createTestCartItem({
                id: '1',
                product_id: 1,
                price: 1000,
                price_with_iva: 1210,
                sale_price: 1000,
                iva_rate: 21,
                allow_discount: false,
            }),
            createTestCartItem({
                id: '2',
                product_id: 2,
                price: 100,
                price_with_iva: 121,
                sale_price: 100,
                iva_rate: 21,
                allow_discount: true,
            })
        ]

        const totals = calculateSaleTotals(items, { type: '', value: '' })

        // Calculate discountable base for payment discount
        // Product 1: 1000 + 210 IVA = 1210 (not discountable)
        // Product 2: 100 + 21 IVA = 121 (discountable)
        expect(totals.discountableSubtotalWithIva).toBe(121)
        
        // Total includes both: 1210 + 121 = 1331
        expect(totals.total).toBe(1331)
    })
})

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

    it('should apply discount only to explicit discounted amount in mixed explicit payments', () => {
        const total = 100000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '3', amount: '50000' },
            { payment_method_id: '1', amount: '30000' }
        ]

        // 20% solo sobre 50.000 = 10.000
        // Total final esperado: 100.000 - 10.000 = 90.000
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(10000)
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

    it('should keep full-total discount when there is a single discounted method with explicit amount', () => {
        const total = 35000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '3', amount: '28000' }
        ]

        // Regresión UX: con un único método de 20%, el descuento debe mantenerse
        // sobre el total de la venta para que 35.000 -> 28.000.
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(7000)
    })

    it('should keep full-total discount for single discounted method even during underpayment', () => {
        // Total 1000.
        // Pay 500 with 10%.
        // No other rows, pero UX requiere no mover el total mientras se escribe.

        const total = 1000
        const payments: DiscountablePayment[] = [
            { payment_method_id: '2', amount: '500' }
        ]

        // El descuento se mantiene sobre el total completo: 100.
        expect(calculatePaymentDiscount(total, payments, methods)).toBe(100)
    })
})

describe('normalizePaymentsForFinalTotal', () => {
    const paymentMethods: PaymentMethodLike[] = [
        { id: '1', name: 'EFECTIVO 20' },
        { id: '2', name: 'M.PAGO POSNET' },
        { id: '3', name: 'Cuenta Corriente' },
    ]

    it('should keep payments unchanged when payment is pending', () => {
        const finalTotal = 90000
        const payments: SalePaymentInput[] = [
            { payment_method_id: '1', amount: '50000' },
        ]

        const result = normalizePaymentsForFinalTotal(finalTotal, payments, paymentMethods)

        expect(result.diff).toBe(40000)
        expect(result.payments).toEqual([
            { payment_method_id: 1, amount: 50000 },
        ])
    })

    it('should keep payments unchanged when payment is exact', () => {
        const finalTotal = 90000
        const payments: SalePaymentInput[] = [
            { payment_method_id: '1', amount: '50000' },
            { payment_method_id: '2', amount: '40000' },
        ]

        const result = normalizePaymentsForFinalTotal(finalTotal, payments, paymentMethods)

        expect(result.diff).toBe(0)
        expect(result.payments).toEqual([
            { payment_method_id: 1, amount: 50000 },
            { payment_method_id: 2, amount: 40000 },
        ])
    })

    it('should discount change from cash payments first', () => {
        const finalTotal = 88000
        const payments: SalePaymentInput[] = [
            { payment_method_id: '1', amount: '50000' },
            { payment_method_id: '2', amount: '40000' },
        ]

        const result = normalizePaymentsForFinalTotal(finalTotal, payments, paymentMethods)

        expect(result.diff).toBe(-2000)
        expect(result.payments).toEqual([
            { payment_method_id: 1, amount: 48000 },
            { payment_method_id: 2, amount: 40000 },
        ])
    })

    it('should consume change across multiple cash rows from last to first', () => {
        const finalTotal = 95000
        const payments: SalePaymentInput[] = [
            { payment_method_id: '1', amount: '30000' },
            { payment_method_id: '2', amount: '45000' },
            { payment_method_id: '1', amount: '25000' },
        ]

        const result = normalizePaymentsForFinalTotal(finalTotal, payments, paymentMethods)

        expect(result.diff).toBe(-5000)
        expect(result.payments).toEqual([
            { payment_method_id: 1, amount: 30000 },
            { payment_method_id: 2, amount: 45000 },
            { payment_method_id: 1, amount: 20000 },
        ])
    })

    it('should fallback to last row when no cash method exists', () => {
        const finalTotal = 98000
        const payments: SalePaymentInput[] = [
            { payment_method_id: '2', amount: '50000' },
            { payment_method_id: '3', amount: '50000' },
        ]

        const result = normalizePaymentsForFinalTotal(finalTotal, payments, paymentMethods)

        expect(result.diff).toBe(-2000)
        expect(result.payments).toEqual([
            { payment_method_id: 2, amount: 50000 },
            { payment_method_id: 3, amount: 48000 },
        ])
    })
})
