/**
 * Tipos de datos relacionados con comprobantes
 */

export interface ReceiptType {
  id: number;
  name: string;
  afip_code: number;
}

export interface AfipReceiptType {
  id: number;
  description: string;
}

/**
 * IDs de tipos de comprobante internos y AFIP
 */
export const RECEIPT_TYPE_IDS = {
  PRESUPUESTO: 1,
  FACTURA_X: 2,
  FACTURA_A: 3,
  FACTURA_B: 8,
  FACTURA_C: 13,
  FACTURA_M: 17,
} as const;

/**
 * Mapeo de códigos AFIP a IDs internos
 * - 1 (AFIP) → Factura A (ID 3)
 * - 6 (AFIP) → Factura B (ID 8)
 * - 11 (AFIP) → Factura C (ID 13)
 * - 51 (AFIP) → Factura M (ID 17)
 */
export const AFIP_CODE_TO_INTERNAL_ID: Record<number, number> = {
  1: RECEIPT_TYPE_IDS.FACTURA_A,
  6: RECEIPT_TYPE_IDS.FACTURA_B,
  11: RECEIPT_TYPE_IDS.FACTURA_C,
  51: RECEIPT_TYPE_IDS.FACTURA_M,
} as const;

/**
 * Tipos de comprobante internos (siempre disponibles)
 */
export const INTERNAL_RECEIPT_TYPES: ReceiptType[] = [
  { id: RECEIPT_TYPE_IDS.PRESUPUESTO, name: 'Presupuesto', afip_code: 0 },
  { id: RECEIPT_TYPE_IDS.FACTURA_X, name: 'Factura X', afip_code: 0 },
];

/**
 * Prioridad de selección por defecto de tipos de comprobante
 */
export const DEFAULT_RECEIPT_PRIORITY = [
  RECEIPT_TYPE_IDS.FACTURA_B,
  RECEIPT_TYPE_IDS.FACTURA_X,
] as const;
