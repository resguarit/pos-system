/**
 * Parser configurable para etiquetas de balanza (EAN-13 con PLU e importe/peso embebido).
 * Formato por defecto alineado con Systel / uso típico en Argentina:
 * - Prefijo 2 dígitos (ej. 20)
 * - PLU 4 dígitos (posiciones 3–6 en humano = índices 2–5)
 * - Valor 6 dígitos (importe total en pesos sin centavos, o peso según valueType)
 * - Dígito verificador EAN-13
 */

export type ScaleBarcodeValueType = 'amount_ars_whole' | 'weight_kg_thousandths'

export interface ScaleBarcodeRule {
  /** Prefijo de 2 dígitos (ej. "20") */
  prefix2: string
  pluLength: number
  valueLength: number
  valueType: ScaleBarcodeValueType
}

export const DEFAULT_SCALE_BARCODE_RULE: ScaleBarcodeRule = {
  prefix2: '20',
  pluLength: 4,
  valueLength: 6,
  valueType: 'amount_ars_whole',
}

/** Tolerancia en pesos entre importe de etiqueta y línea (qty × precio/kg) por redondeo */
export const SCALE_LINE_AMOUNT_TOLERANCE_ARS = 1.5

/**
 * Dígito verificador EAN-13 (12 primeros dígitos).
 */
export function ean13CheckDigit(digits12: string): number {
  const d = digits12.replace(/\D/g, '')
  if (d.length !== 12) return -1
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const n = parseInt(d[i]!, 10)
    sum += i % 2 === 0 ? n : n * 3
  }
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

export function isValidEan13(raw: string): boolean {
  const s = raw.replace(/\D/g, '')
  if (s.length !== 13) return false
  const check = ean13CheckDigit(s.slice(0, 12))
  return check === parseInt(s[12]!, 10)
}

export interface ParsedScaleBarcode {
  raw: string
  pluDigits: string
  pluNormalized: string
  embeddedValue: number
  valueType: ScaleBarcodeValueType
  rule: ScaleBarcodeRule
}

/**
 * Normaliza PLU para comparar con DB (ej. "0036" y "36" → "36").
 */
export function normalizeScalePlu(pluDigits: string): string {
  const t = pluDigits.replace(/\D/g, '').replace(/^0+/, '')
  return t === '' ? '0' : t
}

/**
 * Intenta interpretar un escaneo como EAN-13 de balanza con importe embebido.
 */
export function tryParseScaleBarcode(
  raw: string,
  rule: ScaleBarcodeRule = DEFAULT_SCALE_BARCODE_RULE
): ParsedScaleBarcode | null {
  const s = raw.trim().replace(/\D/g, '')
  if (s.length !== 13) return null
  if (!isValidEan13(s)) return null
  if (s.slice(0, 2) !== rule.prefix2) return null

  const pluStart = 2
  const pluDigits = s.slice(pluStart, pluStart + rule.pluLength)
  if (pluDigits.length !== rule.pluLength || !/^\d+$/.test(pluDigits)) return null

  const valueStart = pluStart + rule.pluLength
  const valueStr = s.slice(valueStart, valueStart + rule.valueLength)
  if (valueStr.length !== rule.valueLength || !/^\d+$/.test(valueStr)) return null

  const embeddedValue = parseInt(valueStr, 10)
  if (!Number.isFinite(embeddedValue) || embeddedValue < 0) return null

  return {
    raw: s,
    pluDigits,
    pluNormalized: normalizeScalePlu(pluDigits),
    embeddedValue,
    valueType: rule.valueType,
    rule,
  }
}

/**
 * Cantidad en kg cuando el valor embebido es importe en pesos y el precio de venta es $/kg (con IVA).
 */
export function quantityKgFromEmbeddedAmount(
  embeddedAmountArs: number,
  salePricePerKgWithIva: number
): number {
  if (salePricePerKgWithIva <= 0) return 0
  return embeddedAmountArs / salePricePerKgWithIva
}

/**
 * Kg para línea de balanza: alta precisión para que (kg × $/kg) coincida con el importe de la etiqueta.
 * Redondear kg a 4 decimales rompía el total (ej. 0,175 × 26900 ≠ 4708).
 */
export function quantityKgForScaleLine(
  embeddedAmountArs: number,
  salePricePerKgWithIva: number
): number {
  if (salePricePerKgWithIva <= 0) return 0
  // División directa: evita deriva de redondear kg; el total de línea lo fija scale_embedded_amount en totales
  return embeddedAmountArs / salePricePerKgWithIva
}

export function roundScaleQuantityKg(qty: number): number {
  return Math.round(qty * 10000) / 10000
}
