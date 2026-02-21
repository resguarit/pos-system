import { describe, expect, it } from 'vitest'
import {
  calculatePaymentDiscount,
  calculatePaymentStatus,
  normalizePaymentsForFinalTotal,
  roundToTwoDecimals,
  type DiscountableMethod,
  type DiscountablePayment,
} from './sale-calculations'

describe('POS sale flow integration', () => {
  const methods: DiscountableMethod[] = [
    { id: '1', discount_percentage: 20 },
    { id: '2', discount_percentage: 0 },
  ]

  it('calculates final total and payment status correctly for mixed explicit payments', () => {
    const saleTotal = 100000
    const payments: DiscountablePayment[] = [
      { payment_method_id: '1', amount: '50000' },
      { payment_method_id: '2', amount: '40000' },
    ]

    const paymentDiscount = calculatePaymentDiscount(saleTotal, payments, methods)
    const finalTotal = roundToTwoDecimals(saleTotal - paymentDiscount)

    expect(paymentDiscount).toBe(10000)
    expect(finalTotal).toBe(90000)

    const paid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
    const paymentStatus = calculatePaymentStatus(finalTotal, paid)

    expect(paymentStatus).toEqual({ status: 'exact', amount: 0 })

    const normalized = normalizePaymentsForFinalTotal(finalTotal, payments, [
      { id: '1', name: 'Efectivo 20' },
      { id: '2', name: 'Transferencia' },
    ])

    expect(normalized.diff).toBe(0)
    expect(normalized.payments).toEqual([
      { payment_method_id: 1, amount: 50000 },
      { payment_method_id: 2, amount: 40000 },
    ])
  })

  it('keeps UI change status and backend payload aligned when there is overpayment with cash', () => {
    const saleTotal = 100000
    const payments: DiscountablePayment[] = [
      { payment_method_id: '1', amount: '50000' },
      { payment_method_id: '2', amount: '50000' },
    ]

    const paymentDiscount = calculatePaymentDiscount(saleTotal, payments, methods)
    const finalTotal = roundToTwoDecimals(saleTotal - paymentDiscount)

    expect(paymentDiscount).toBe(10000)
    expect(finalTotal).toBe(90000)

    const paid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
    const paymentStatus = calculatePaymentStatus(finalTotal, paid)

    expect(paymentStatus).toEqual({ status: 'change', amount: 10000 })

    const normalized = normalizePaymentsForFinalTotal(finalTotal, payments, [
      { id: '1', name: 'Efectivo 20' },
      { id: '2', name: 'Transferencia' },
    ])

    expect(normalized.diff).toBe(-10000)
    expect(normalized.payments).toEqual([
      { payment_method_id: 1, amount: 40000 },
      { payment_method_id: 2, amount: 50000 },
    ])
  })
})
