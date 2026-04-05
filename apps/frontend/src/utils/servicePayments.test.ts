import { describe, it, expect } from "vitest"
import { getLastPayment, sortPaymentsByDateDesc } from "./servicePayments"

describe("sortPaymentsByDateDesc", () => {
  it("orders newest first, then higher id", () => {
    const a = [
      { id: 1, amount: "10", payment_date: "2025-01-01", notes: null },
      { id: 2, amount: "20", payment_date: "2025-06-01", notes: null },
      { id: 3, amount: "15", payment_date: "2025-06-01", notes: null },
    ]
    const s = sortPaymentsByDateDesc(a)
    expect(s.map((p) => p.id)).toEqual([3, 2, 1])
  })

  it("returns empty for empty input", () => {
    expect(sortPaymentsByDateDesc([])).toEqual([])
  })
})

describe("getLastPayment", () => {
  it("returns null for empty", () => {
    expect(getLastPayment([])).toBeNull()
  })

  it("returns single element", () => {
    const p = { id: 5, amount: "1", payment_date: "2024-01-01", notes: null }
    expect(getLastPayment([p])).toEqual(p)
  })
})
