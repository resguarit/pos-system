/**
 * Utilidades para tipos de comprobante AFIP en punto de venta.
 * Centraliza la lógica de filtrado y mapeo desde la respuesta de AFIP.
 */

import { AFIP_CODES } from '@/lib/constants/afipCodes'

/** Longitud del CUIT (solo dígitos) según AFIP */
export const CUIT_LENGTH = 11

/**
 * Comprobantes de solo uso interno: no se autorizan con AFIP (Presupuesto, Factura X).
 */
export function isInternalOnlyReceiptType(afipCode: string | number | null | undefined): boolean {
  if (afipCode == null) return false
  const code = String(afipCode)
  return code === AFIP_CODES.PRESUPUESTO || code === AFIP_CODES.FACTURA_X
}

/**
 * Indica si el tipo de comprobante exige un cliente con CUIT válido para AFIP.
 * Solo Factura A (001) lo exige; B/C/M/FCE permiten consumidor final.
 */
export function receiptTypeRequiresCustomerWithCuit(
  afipCode: string | number | null | undefined
): boolean {
  return afipCode != null && String(afipCode) === AFIP_CODES.FACTURA_A
}

/**
 * Valida que el valor sea un CUIT de 11 dígitos (solo números).
 */
export function isValidCuitForAfip(value: string | number | null | undefined): boolean {
  if (value == null || value === '') return false
  const digits = String(value).replace(/\D/g, '')
  return digits.length === CUIT_LENGTH
}

/** Códigos de tipos internos (siempre disponibles en POS) */
export const INTERNAL_RECEIPT_CODES: readonly string[] = [
  AFIP_CODES.PRESUPUESTO,
  AFIP_CODES.FACTURA_X,
] as const

/** Ítem de la respuesta GET /afip/receipt-types */
export interface AfipReceiptTypeItem {
  id?: number
  description?: string
}

/** Palabras que excluyen un tipo de la lista "solo facturas" en POS */
const EXCLUDE_DESCRIPTION_KEYWORDS = [
  'nota de débito',
  'nota de crédito',
  'recibo',
] as const

/**
 * Indica si un tipo de AFIP es una factura (excluye ND, NC, Recibo).
 */
export function isFacturaType(item: AfipReceiptTypeItem): boolean {
  const d = (item.description ?? '').toLowerCase()
  if (EXCLUDE_DESCRIPTION_KEYWORDS.some((kw) => d.includes(kw))) return false
  return d.includes('factura')
}

/**
 * Convierte el id numérico de AFIP al afip_code usado en la app.
 * AFIP usa 1, 6, 51 para Factura A, B, M; 201, 206 para FCE A, B.
 */
export function afipIdToCode(id: number): string {
  return id < 100 ? String(id).padStart(3, '0') : String(id)
}

/**
 * Dado el array de tipos devueltos por AFIP para un CUIT, devuelve
 * el set de afip_codes que corresponden solo a facturas (para usar en POS).
 * Incluye siempre los códigos internos (Presupuesto, Factura X).
 */
export function getAllowedAfipCodesForPos(afipTypes: AfipReceiptTypeItem[] | null): Set<string> {
  const allowed = new Set<string>(INTERNAL_RECEIPT_CODES)
  if (!afipTypes?.length) return allowed

  const facturaOnly = afipTypes.filter(isFacturaType)
  facturaOnly.forEach((t) => {
    const id = t.id ?? 0
    allowed.add(afipIdToCode(id))
  })
  return allowed
}
