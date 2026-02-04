/**
 * Utilidades para tipos de comprobante ARCA en punto de venta.
 * Centraliza la lógica de filtrado y mapeo desde la respuesta de ARCA.
 */

import { ARCA_CODES } from '@/lib/constants/arcaCodes'

/** Longitud del CUIT (solo dígitos) según ARCA */
export const CUIT_LENGTH = 11

/**
 * Comprobantes de solo uso interno: no se autorizan con ARCA (Presupuesto, Factura X).
 */
export function isInternalOnlyReceiptType(afipCode: string | number | null | undefined): boolean {
  if (afipCode == null) return false
  const code = String(afipCode)
  return code === ARCA_CODES.PRESUPUESTO || code === ARCA_CODES.FACTURA_X
}

/**
 * Indica si el tipo de comprobante exige un cliente con CUIT válido para ARCA.
 * Solo Factura A (001) lo exige; B/C/M/FCE permiten consumidor final.
 */
export function receiptTypeRequiresCustomerWithCuit(
  afipCode: string | number | null | undefined
): boolean {
  return afipCode != null && String(afipCode) === ARCA_CODES.FACTURA_A
}

/**
 * Valida que el valor sea un CUIT de 11 dígitos (solo números).
 */
export function isValidCuitForArca(value: string | number | null | undefined): boolean {
  if (value == null || value === '') return false
  const digits = String(value).replace(/\D/g, '')
  return digits.length === CUIT_LENGTH
}

/** Códigos de tipos internos (siempre disponibles en POS) */
export const INTERNAL_RECEIPT_CODES: readonly string[] = [
  ARCA_CODES.PRESUPUESTO,
  ARCA_CODES.FACTURA_X,
] as const

/** Ítem de la respuesta GET /arca/receipt-types */
export interface ArcaReceiptTypeItem {
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
 * Indica si un tipo de ARCA es una factura (excluye ND, NC, Recibo).
 */
export function isFacturaType(item: ArcaReceiptTypeItem): boolean {
  const d = (item.description ?? '').toLowerCase()
  if (EXCLUDE_DESCRIPTION_KEYWORDS.some((kw) => d.includes(kw))) return false
  return d.includes('factura')
}

/**
 * Convierte el id numérico de ARCA al afip_code usado en la app.
 * ARCA usa 1, 6, 51 para Factura A, B, M; 201, 206 para FCE A, B.
 */
export function arcaIdToCode(id: number): string {
  return id < 100 ? String(id).padStart(3, '0') : String(id)
}

/**
 * Dado el array de tipos devueltos por ARCA para un CUIT, devuelve
 * el set de afip_codes que corresponden solo a facturas (para usar en POS).
 * Incluye siempre los códigos internos (Presupuesto, Factura X).
 */
export function getAllowedArcaCodesForPos(arcaTypes: ArcaReceiptTypeItem[] | null): Set<string> {
  const allowed = new Set<string>(INTERNAL_RECEIPT_CODES)
  if (!arcaTypes?.length) return allowed

  const facturaOnly = arcaTypes.filter(isFacturaType)
  facturaOnly.forEach((t) => {
    const id = t.id ?? 0
    allowed.add(arcaIdToCode(id))
  })
  return allowed
}

/** Estilo para badge de tipo de comprobante (bg, text, border en Tailwind) */
export interface ReceiptTypeBadgeStyle {
  bg: string
  text: string
  border: string
}

/** Mapa de estilos por afip_code para badges (colores distintos por tipo) */
const RECEIPT_TYPE_STYLES_BY_CODE: Record<string, ReceiptTypeBadgeStyle> = {
  [ARCA_CODES.FACTURA_A]: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  [ARCA_CODES.FACTURA_B]: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' },
  [ARCA_CODES.FACTURA_C]: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
  [ARCA_CODES.PRESUPUESTO]: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  [ARCA_CODES.FACTURA_X]: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  '051': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  '201': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300' },
  '206': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
  '211': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
}

const DEFAULT_RECEIPT_STYLE: ReceiptTypeBadgeStyle = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-300',
}

/**
 * Devuelve el estilo del badge para un tipo de comprobante por afip_code.
 * Uso: tabla de ventas, listados; colores consistentes por tipo.
 */
export function getReceiptTypeBadgeStyle(afipCode: string | number | null | undefined): ReceiptTypeBadgeStyle {
  if (afipCode == null || afipCode === '') return DEFAULT_RECEIPT_STYLE
  const s = String(afipCode).replace(/\D/g, '')
  const key = s.length <= 2 ? s.padStart(3, '0') : s
  return RECEIPT_TYPE_STYLES_BY_CODE[key] ?? DEFAULT_RECEIPT_STYLE
}

