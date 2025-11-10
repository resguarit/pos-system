/**
 * Type definitions for Cash Register system
 * Following TypeScript best practices with strict typing
 */

// ============================================================================
// Core Types
// ============================================================================

export type CashRegisterStatus = 'open' | 'closed'

export type MovementOperationType = 'entrada' | 'salida'

// ============================================================================
// Entity Types
// ============================================================================

export interface PaymentMethod {
  id: number
  name: string
  description?: string
  is_active?: boolean
}

export interface MovementType {
  id: number
  code: string
  description: string
  name?: string
  affects_cash?: boolean
  is_cash_movement?: boolean
  is_income?: boolean
  operation_type?: MovementOperationType | string
}

export interface User {
  id: number
  name?: string
  username?: string
  full_name?: string
  email?: string
}

export interface Branch {
  id: number
  description: string
}

export interface CashMovement {
  id: number
  cash_register_id: number
  movement_type_id: number
  payment_method_id?: number
  amount: string | number
  description: string
  user_id: number
  reference_type?: string
  reference_id?: number
  created_at: string
  updated_at?: string
  affects_balance?: boolean
  movement_type?: MovementType
  payment_method?: PaymentMethod
  user?: User
}

export interface CashRegister {
  id: number
  branch_id: number
  user_id: number
  opened_at: string
  closed_at?: string | null
  initial_amount: string
  closing_balance?: string | null
  final_amount?: string | null
  status: CashRegisterStatus
  notes?: string | null
  expected_cash_balance?: number | null
  payment_method_totals?: Record<string, number>
  branch?: Branch
  user?: User
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateMovementRequest {
  cash_register_id: number
  movement_type_id: number
  payment_method_id?: number
  amount: number
  description: string
  user_id: number
  reference_type?: string
  reference_id?: number
}

export interface CloseCashRegisterRequest {
  closing_balance: number
  notes?: string
}

export interface OpenCashRegisterRequest {
  branch_id: number
  user_id: number
  opening_balance: number
  notes?: string
}

export interface MovementPaginationOptions {
  page?: number
  perPage?: number
  q?: string
}

export interface MovementsPaginationMeta {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaymentMethodBreakdown {
  [methodName: string]: number
}

export interface FilteredMovementsResult {
  movements: CashMovement[]
  total: number
  currentPage: number
  lastPage: number
}

// ============================================================================
// Constants
// ============================================================================

export const SYSTEM_MOVEMENT_TYPES = [
  'Apertura automática',
  'Cierre automático',
  'Ajuste del sistema'
] as const

export const PAYMENT_METHOD_KEYWORDS: Record<string, readonly string[]> = {
  'Efectivo': ['efectivo', 'cash', 'contado'],
  'Tarjeta Débito': ['tarjeta de débito', 'débito', 'debito'],
  'Tarjeta Crédito': ['tarjeta de crédito', 'crédito', 'credito'],
  'Transferencia': ['transferencia', 'transfer', 'banco'],
  'Mercado Pago': ['mercado pago', 'mp', 'mercadopago'],
  'Tarjeta': ['tarjeta', 'card']
} as const

export const DEFAULT_PAGINATION = {
  page: 1,
  perPage: 10,
  maxPerPage: 10000
} as const

