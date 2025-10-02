// Interfaces basadas en los modelos proporcionados
import type { Branch } from './branch';

export interface SaleHeader {
  id: number
  date: string
  receipt_type_id: number
  branch_id: number // This might be inconsistent if branch is a string. Assuming API sends this separately or it's not used when branch is a string.
  receipt_number: string
  client_id: number // Similar to branch_id, this might be inconsistent.
  items_count: number
  sale_fiscal_condition_id: number
  sale_document_type_id: number
  sale_document_number: string
  subtotal: number
  total_iva_amount: number
  iibb: number
  internal_tax: number
  discount_amount: number
  total: number
  cae: string
  cae_expiration_date: string | null
  service_from_date: string | null
  service_to_date: string | null
  service_due_date: string | null
  user_id: number
  created_at: string
  updated_at: string
  status?: 'completed' | 'annulled'
  annulled_at?: string | null
  annulled_by?: number | null
  annulment_reason?: string | null
  customer?: string | {
    id: number
    person?: {
      first_name: string
      last_name: string
    }
    business_name?: string
  }; // Added to support direct customer name string from API
  customer_name?: string // nombre completo o razón social del cliente
  seller?: string; // nombre del vendedor
  seller_name?: string; // nombre del vendedor formateado
  seller_id?: number; // ID del vendedor
  affects_stock?: boolean // Indica si la venta afecta el stock
  is_budget?: boolean // Indica si es un presupuesto

  // Relaciones
  receipt_type?: string | {
    id: number
    description: string
    afip_code: string
    affects_stock_by_default?: boolean
  }
  branch?: string | Branch // Changed to allow string for branch name or full Branch object
  client?: {
    id: number
    person?: {
      first_name: string
      last_name: string
    }
    business_name?: string
  }
  user?: {
    id: number
    name: string
  }
  saleFiscalCondition?: {
    id: number
    name: string
  }
  saleDocumentType?: {
    id: number
    name: string
  }
  items?: SaleItem[]
  saleIvas?: SaleIva[]
  // Pagos asociados a la venta (opcional)
  payments?: SalePayment[]
  sale_payments?: SalePayment[] // alias común en APIs
}

export interface SaleItem {
  id: number
  sale_header_id?: number
  product_id: number
  description: string // Added description property
  quantity: number
  unit_price: number
  iva_rate: number
  item_subtotal: number
  item_iva: number
  item_total: number
  product?: import("./product").Product
}

export interface SaleIva {
  id: number
  sale_header_id: number
  iva_id: number
  base_amount: number
  iva_amount: number

  // Relaciones
  iva?: {
    id: number
    name: string
    percentage: number
  }
}

// Información de pago por venta
export interface SalePayment {
  id?: number
  sale_header_id?: number
  payment_method_id?: number
  amount: number
  payment_method?: {
    id: number
    name?: string
    description?: string
  }
  created_at?: string
  // Campos alternativos que podrían venir del backend
  method_name?: string
}

// Tipos de comprobantes
export const ReceiptTypeCode = {
  FACTURA_A: "FA",
  FACTURA_B: "FB",
  FACTURA_C: "FC",
  NOTA_CREDITO: "NC",
  NOTA_DEBITO: "ND",
  PRESUPUESTO: "PRE",
  REMITO: "REM",
  ORDEN_COMPRA: "OC",
} as const;

export type ReceiptTypeCode = typeof ReceiptTypeCode[keyof typeof ReceiptTypeCode];
