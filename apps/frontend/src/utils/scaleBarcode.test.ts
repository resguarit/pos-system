import { describe, expect, it } from 'vitest'
import {
  ean13CheckDigit,
  isValidEan13,
  normalizeScalePlu,
  quantityKgFromEmbeddedAmount,
  quantityKgForScaleLine,
  tryParseScaleBarcode,
} from './scaleBarcode'

describe('scaleBarcode', () => {
  it('validates EAN-13 check digit for sample label', () => {
    expect(ean13CheckDigit('200036004708')).toBe(8)
    expect(isValidEan13('2000360047088')).toBe(true)
  })

  it('parses Systel-style price-embedded barcode', () => {
    const p = tryParseScaleBarcode('2000360047088')
    expect(p).not.toBeNull()
    expect(p!.pluNormalized).toBe('36')
    expect(p!.embeddedValue).toBe(4708)
  })

  it('rejects invalid checksum', () => {
    expect(tryParseScaleBarcode('2000360047080')).toBeNull()
  })

  it('normalizes PLU digits', () => {
    expect(normalizeScalePlu('0036')).toBe('36')
  })

  it('computes kg from amount and price/kg', () => {
    const kg = quantityKgFromEmbeddedAmount(4708, 26900)
    expect(kg).toBeCloseTo(4708 / 26900, 10)
  })

  it('quantityKgForScaleLine keeps line total aligned with label amount', () => {
    const kg = quantityKgForScaleLine(4708, 26900)
    expect(kg * 26900).toBeCloseTo(4708, 8)
  })
})
