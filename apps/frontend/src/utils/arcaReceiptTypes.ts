/**
 * Utilidades para tipos de comprobante ARCA en punto de venta.
 * Centraliza la lógica de filtrado y mapeo desde la respuesta de ARCA.
 */

import { ARCA_CODES } from '@/lib/constants/arcaCodes'

/** Longitud del CUIT (solo dígitos) según ARCA */
export const CUIT_LENGTH = 11

/** Códigos AFIP de condición IVA */
export const CONDICION_IVA = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
} as const

/** Nombres de condiciones fiscales normalizados */
const FISCAL_CONDITION_NAME_TO_CODE: Record<string, number> = {
  'responsable inscripto': CONDICION_IVA.RESPONSABLE_INSCRIPTO,
  'responsable inscrito': CONDICION_IVA.RESPONSABLE_INSCRIPTO,
  'ri': CONDICION_IVA.RESPONSABLE_INSCRIPTO,
  'monotributista': CONDICION_IVA.MONOTRIBUTO,
  'monotributo': CONDICION_IVA.MONOTRIBUTO,
  'consumidor final': CONDICION_IVA.CONSUMIDOR_FINAL,
  'cf': CONDICION_IVA.CONSUMIDOR_FINAL,
  'exento': CONDICION_IVA.EXENTO,
  'iva exento': CONDICION_IVA.EXENTO,
}

/**
 * Resuelve el código AFIP de condición IVA a partir de una condición fiscal.
 * Prioriza afip_code si existe, sino intenta resolver por nombre.
 */
export function resolveFiscalConditionCode(
  fiscalCondition: { afip_code?: string | number | null; name?: string | null } | null | undefined,
  defaultCode: number = CONDICION_IVA.CONSUMIDOR_FINAL
): number {
  if (!fiscalCondition) return defaultCode

  // Priorizar afip_code si existe
  if (fiscalCondition.afip_code != null && fiscalCondition.afip_code !== '') {
    return Number(fiscalCondition.afip_code)
  }

  // Fallback: resolver por nombre
  const name = fiscalCondition.name?.toLowerCase().trim()
  if (name && FISCAL_CONDITION_NAME_TO_CODE[name] !== undefined) {
    return FISCAL_CONDITION_NAME_TO_CODE[name]
  }

  return defaultCode
}

/**
 * Resultado de validación de reglas de emisión.
 */
export interface EmisionValidation {
  isValid: boolean
  suggestedReceiptType: 'A' | 'B' | 'C' | null
  message: string | null
}

/**
 * Valida si la combinación de tipo de comprobante y condición del receptor es válida
 * según las reglas de emisión AFIP para un emisor Responsable Inscripto.
 * 
 * Reglas para RI:
 * - RI → RI = Factura A
 * - RI → Monotributista = Factura A
 * - RI → CF/Exento = Factura B
 * 
 * Regla especial: si el receptor NO tiene CUIT válido, se trata como
 * Consumidor Final independientemente de la condición fiscal almacenada.
 * Factura A siempre requiere CUIT; Factura B permite DocTipo 99 / DocNro 0.
 * 
 * @param selectedReceiptAfipCode Código AFIP del comprobante seleccionado (001=A, 006=B)
 * @param receiverConditionCode Código AFIP de la condición IVA del receptor
 * @param receiverHasCuit Si el receptor tiene un CUIT válido de 11 dígitos
 * @returns Objeto con resultado de validación y tipo sugerido
 */
export function validateEmisionRulesForRI(
  selectedReceiptAfipCode: string | null | undefined,
  receiverConditionCode: number | null | undefined,
  receiverHasCuit: boolean = true
): EmisionValidation {
  if (!selectedReceiptAfipCode || receiverConditionCode == null) {
    return { isValid: true, suggestedReceiptType: null, message: null }
  }

  const code = String(selectedReceiptAfipCode)

  // Solo validamos facturas A y B
  const isFacturaA = code === ARCA_CODES.FACTURA_A // 001
  const isFacturaB = code === ARCA_CODES.FACTURA_B // 006

  if (!isFacturaA && !isFacturaB) {
    return { isValid: true, suggestedReceiptType: null, message: null }
  }

  // Sin CUIT válido → se trata como Consumidor Final para AFIP.
  // Factura B es válida (DocTipo 99, DocNro 0); Factura A requiere CUIT obligatoriamente.
  if (!receiverHasCuit) {
    if (isFacturaA) {
      return {
        isValid: false,
        suggestedReceiptType: 'B',
        message: 'No se puede emitir Factura A sin CUIT. Se debe emitir Factura B (Consumidor Final).',
      }
    }
    // Factura B sin CUIT → válida (consumidor final)
    return { isValid: true, suggestedReceiptType: null, message: null }
  }

  const receiverCode = Number(receiverConditionCode)

  // Receptores que requieren Factura A
  const requiresFacturaA =
    receiverCode === CONDICION_IVA.RESPONSABLE_INSCRIPTO ||
    receiverCode === CONDICION_IVA.MONOTRIBUTO

  // Receptores que requieren Factura B
  const requiresFacturaB =
    receiverCode === CONDICION_IVA.CONSUMIDOR_FINAL ||
    receiverCode === CONDICION_IVA.EXENTO

  const receiverName = getCondicionIvaName(receiverCode)

  if (isFacturaB && requiresFacturaA) {
    return {
      isValid: false,
      suggestedReceiptType: 'A',
      message: `No se puede emitir Factura B a un cliente ${receiverName}. Se debe emitir Factura A.`,
    }
  }

  if (isFacturaA && requiresFacturaB) {
    return {
      isValid: false,
      suggestedReceiptType: 'B',
      message: `No se puede emitir Factura A a un cliente ${receiverName}. Se debe emitir Factura B.`,
    }
  }

  return { isValid: true, suggestedReceiptType: null, message: null }
}

/**
 * Devuelve el nombre legible de una condición IVA por código AFIP.
 */
export function getCondicionIvaName(code: number | null | undefined): string {
  switch (code) {
    case CONDICION_IVA.RESPONSABLE_INSCRIPTO:
      return 'Responsable Inscripto'
    case CONDICION_IVA.MONOTRIBUTO:
      return 'Monotributista'
    case CONDICION_IVA.CONSUMIDOR_FINAL:
      return 'Consumidor Final'
    case CONDICION_IVA.EXENTO:
      return 'Exento'
    default:
      return 'desconocido'
  }
}

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

