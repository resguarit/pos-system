// ARCA Codes para tipos de comprobante
// Estos códigos son estándar y no deben cambiar
export const ARCA_CODES = {
  // Comprobantes tipo A
  FACTURA_A: '001',
  NOTA_DEBITO_A: '002',
  NOTA_CREDITO_A: '003',
  RECIBO_A: '004',
  NOTA_VENTA_CONTADO_A: '005',

  // Comprobantes tipo B
  FACTURA_B: '006',
  NOTA_DEBITO_B: '007',
  NOTA_CREDITO_B: '008',
  RECIBO_B: '009',
  NOTA_VENTA_CONTADO_B: '010',

  // Comprobantes tipo C
  FACTURA_C: '011',
  NOTA_DEBITO_C: '012',
  NOTA_CREDITO_C: '013',
  RECIBO_C: '015',

  // Otros tipos
  PRESUPUESTO: '016',
  FACTURA_X: '017',
  REMITO_X: '018',
} as const;

// Códigos más utilizados en la aplicación
export const DEFAULT_RECEIPT_TYPES = {
  DEFAULT_SALE: ARCA_CODES.FACTURA_X, // Factura X por defecto para ventas
  BUDGET: ARCA_CODES.PRESUPUESTO, // Presupuesto
} as const;

export type ArcaCode = typeof ARCA_CODES[keyof typeof ARCA_CODES];

// Interfaz para tipos de comprobante
export interface ReceiptType {
  id: number;
  name: string;
  afip_code: string; // Mantener nombre de propiedad DB por ahora o cambiar si el backend lo cambia
}

// Función utilitaria para buscar tipos de comprobante por ARCA code
export const findReceiptTypeByArcaCode = (
  receiptTypes: ReceiptType[],
  arcaCode: ArcaCode
): ReceiptType | undefined => {
  return receiptTypes.find(rt => rt.afip_code === arcaCode);
};

// Función utilitaria para verificar si un tipo de comprobante es presupuesto
export const isBudgetReceiptType = (receiptType: ReceiptType): boolean => {
  return receiptType.afip_code === ARCA_CODES.PRESUPUESTO;
};

// Función utilitaria para verificar si un tipo de comprobante es factura X
export const isFacturaXReceiptType = (receiptType: ReceiptType): boolean => {
  return receiptType.afip_code === ARCA_CODES.FACTURA_X;
};

