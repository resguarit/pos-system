import type { CartItem } from './combo'

export interface PaymentMethod {
  id: number
  name: string
}

export interface ReceiptType {
  id: number
  name: string
  afip_code: number
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
