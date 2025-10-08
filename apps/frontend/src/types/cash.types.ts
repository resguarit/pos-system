export interface CashMovement {
  id: number
  amount: number
  type: 'income' | 'expense'
  description: string
  movement_type_id: number
  movement_type_name: string
  created_at: string
  updated_at: string
  user_id: number
  user_name: string
  cash_register_id: number
  sale_id?: number
  purchase_order_id?: number
  affects_balance?: boolean
}

export interface CashRegister {
  id: number
  branch_id: number
  name: string
  is_open: boolean
  opening_balance: number
  closing_balance?: number
  opened_at: string
  closed_at?: string
  opened_by_user_id: number
  opened_by_user_name: string
  closed_by_user_id?: number
  closed_by_user_name?: string
}

export interface MovementType {
  id: number
  name: string
  type: 'income' | 'expense'
  description?: string
}

export interface CashStats {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  openingBalance: number
  currentBalance: number
  movementCount: number
  cashOnlyBalance: number
}

export interface CashRegisterStatus {
  isOpen: boolean
  register?: CashRegister
  stats: CashStats
  lastMovement?: CashMovement
}

export interface AddMovementData {
  amount: number
  type: 'income' | 'expense'
  description: string
  movement_type_id: number
}


