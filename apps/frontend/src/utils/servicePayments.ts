/**
 * Pure helpers for client service payment lists (ordering, "last payment" display).
 */

export interface ServicePaymentLike {
  id: number
  amount: string
  payment_date: string
  notes: string | null
}

/** Sort by payment_date descending (newest first), then id descending as tiebreaker. */
export function sortPaymentsByDateDesc<T extends ServicePaymentLike>(payments: T[]): T[] {
  return [...payments].sort((a, b) => {
    const ta = new Date(a.payment_date).getTime()
    const tb = new Date(b.payment_date).getTime()
    if (tb !== ta) return tb - ta
    return b.id - a.id
  })
}

/** Most recent payment after sorting, or null. */
export function getLastPayment<T extends ServicePaymentLike>(payments: T[]): T | null {
  if (!payments.length) return null
  return sortPaymentsByDateDesc(payments)[0] ?? null
}
