

export interface PaymentMethod {
  id: number
  name: string
  description?: string
  is_active?: boolean
  affects_cash?: boolean
  discount_percentage?: number
}


export interface ReceiptType {
  id: number
  name: string
  afip_code: string | number
}

export interface Payment {
  payment_method_id: string
  amount: string
}

export interface SaleItem {
  product_id: number
  quantity: number
  unit_price: number
  discount_type?: 'percent' | 'amount'
  discount_value?: number
}

export interface SaleData {
  branch_id: number
  customer_id: number | null
  customer_tax_identity_id?: number | null
  sale_document_number: string | null
  receipt_type_id: number | undefined
  sale_fiscal_condition_id: number | null
  sale_date: string
  subtotal_net: number
  total_iva: number
  total: number
  total_discount: number
  discount_type?: 'percent' | 'amount'
  discount_value?: number
  items: SaleItem[]
  payments: Array<{
    payment_method_id: number
    amount: number
  }>
  converted_from_budget_id?: number | null
}

export interface CompletedSale {
  id: number
  customer?: {
    id: number
    person?: {
      first_name?: string
      last_name?: string
      cuit?: string
    }
    name?: string
  }
  receipt_type?: {
    id: number
    name: string
  }
  branch?: {
    id: number
    description: string
  }
  items?: Array<{
    id: number
    product_id: number
    quantity: number
    unit_price: number
  }>
  saleIvas?: Array<{
    iva_rate: number
    base_amount: number
    tax_amount: number
  }>
}

export interface SaleHeader {
  id: number
  date: string
  receipt_number?: string
  receipt_type?: string | {
    id: number
    name: string
    description?: string
    afip_code?: string | number
  }
  /** Código AFIP del tipo (viene en la lista cuando receipt_type es string) */
  receipt_type_code?: string | number
  customer?: {
    id: number
    person?: {
      first_name?: string
      last_name?: string
      cuit?: string
    }
    business_name?: string
  }
  branch?: string | {
    id: number
    description?: string
    cuit?: string
    point_of_sale?: number
  }
  items?: Array<{
    id: number
    product?: {
      id: number
      name?: string
      description?: string
      sale_price?: number
    }
    quantity: number
    unit_price: number
    item_subtotal?: number
    item_iva?: number
    item_total?: number
    discount_amount?: number
  }>
  subtotal?: number
  total_iva_amount?: number
  total: number
  discount_amount?: number
  status?: string
  seller?: string
  seller_name?: string
  cae?: string | null
  cae_expiration_date?: string | null
  customer_tax_identity_id?: number | null
  /** Identidad fiscal usada en la venta (CUIT / razón social con que se facturó) */
  customer_tax_identity?: {
    id: number
    cuit?: string
    business_name?: string
    fiscal_condition?: { id: number; name?: string }
  } | null
  sale_fiscal_condition?: {
    id: number
    name?: string
    afip_code?: number
  }
  sale_document_number?: string
  sale_document_type?: {
    id: number
    name?: string
    afip_code?: number
  }
  payments?: Array<{
    id: number
    amount: number
    payment_method?: {
      id: number
      name?: string
    }
  }>
  items_count?: number
  // Campos de conversión de presupuesto
  converted_from_budget_id?: number | null
  converted_to_sale_id?: number | null
  converted_from_budget_receipt?: string | null
  converted_to_sale_receipt?: string | null
  converted_at?: string | null
}
