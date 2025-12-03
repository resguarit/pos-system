// Tipos para Cuentas Corrientes
export interface CurrentAccount {
  id: number;
  customer_id: number;
  customer: {
    id: number;
    person_id: number;
    email: string | null;
    active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    person: {
      id: number;
      first_name: string;
      last_name: string;
      address: string | null;
      phone: string | null;
      cuit: string | null;
      fiscal_condition_id: number;
      person_type_id: number;
      document_type_id: number;
      documento: number;
      credit_limit: string | null;
      person_type: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    };
  };
  credit_limit: number | null;
  current_balance: number;
  total_pending_debt: number; // Total de ventas pendientes (saldo adeudado)
  available_credit: number | null;
  credit_usage_percentage: number | null;
  status: 'active' | 'suspended' | 'closed';
  status_text: string;
  notes?: string;
  opened_at?: string;
  closed_at?: string;
  last_movement_at?: string;
  created_at: string;
  updated_at: string;
  movements_count?: number;
  recent_movements?: CurrentAccountMovement[];
}

export interface CurrentAccountMovement {
  id: number;
  current_account_id: number;
  movement_type_id: number;
  movement_type: {
    id: number;
    name: string;
    description: string;
    operation_type: 'entrada' | 'salida';
  };
  amount: number;
  description: string;
  reference?: string;
  sale_id?: number;
  sale?: {
    id: number;
    total?: number;
    created_at?: string;
  };
  balance_before: number;
  balance_after: number;
  metadata?: Record<string, any>;
  user_id?: number;
  user?: {
    id: number;
    name: string;
  };
  movement_date?: string;
  created_at: string;
  updated_at: string;
  operation_type: string;
  is_inflow: boolean;
  is_outflow: boolean;
}

export interface MovementType {
  id: number;
  name: string;
  description: string;
  operation_type: 'entrada' | 'salida';
  is_cash_movement: boolean;
  is_current_account_movement: boolean;
  active: boolean;
}

// Tipos para formularios
export interface CreateCurrentAccountData {
  customer_id: number;
  credit_limit?: number | null;
  notes?: string;
}

export interface UpdateCurrentAccountData {
  customer_id?: number;
  credit_limit?: number | null;
  notes?: string;
}

export interface CreateMovementData {
  current_account_id: number;
  movement_type_id: number;
  amount: number;
  description: string;
  reference?: string;
  sale_id?: number;
  metadata?: Record<string, any>;
  movement_date?: string;
  cash_register_id?: number;
  payment_method_id?: number;
}

export interface ProcessPaymentData {
  amount: number;
  description: string;
  movement_type_id?: number;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface ProcessCreditPurchaseData {
  amount: number;
  description: string;
  movement_type_id?: number;
  sale_id?: number;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCreditLimitData {
  credit_limit: number | null;
  reason?: string;
}

// Tipos para filtros y consultas
export interface CurrentAccountFilters {
  status?: string;
  customer_id?: number;
  min_current_balance?: number;
  max_current_balance?: number;
  min_credit_limit?: number;
  max_credit_limit?: number;
  balance_filter?: 'positive' | 'negative' | 'at_limit' | 'overdrawn';
  search?: string;
  page?: number;
  per_page?: number;
}

export interface MovementFilters {
  from_date?: string;
  to_date?: string;
  movement_type_id?: number;
  operation_type?: 'entrada' | 'salida';
  search?: string;
  page?: number;
  per_page?: number;
}

// Tipos para estadísticas
export interface CurrentAccountStatistics {
  account_id: number;
  current_balance: number;
  credit_limit: number | null;
  available_credit: number;
  credit_usage_percentage: number;
  status: string;
  status_text: string;
  last_movement_at?: string;
  total_movements_30_days: number;
  total_inflows_30_days: number;
  total_outflows_30_days: number;
  net_movement_30_days: number;
}

export interface GeneralStatistics {
  total_accounts: number;
  active_accounts: number;
  suspended_accounts: number;
  closed_accounts: number;
  overdrawn_accounts: number;
  at_limit_accounts: number;
  total_credit_limit: number | null;
  total_current_balance: number;
  total_available_credit: number | null;
  average_credit_limit: number | null;
  average_current_balance: number;
  client_with_highest_debt?: {
    name: string;
    debt_amount: number;
  } | null;
}

// Tipos para reportes
export interface CurrentAccountReport {
  total_accounts: number;
  total_credit_limit: number;
  total_current_balance: number;
  accounts_by_status: Record<string, number>;
  accounts_data: Array<{
    id: number;
    customer_name: string;
    credit_limit: number | null;
    current_balance: number;
    available_credit: number;
    status: string;
    opened_at?: string;
    last_movement_at?: string;
  }>;
}

// Tipos para respuestas de la API
export interface CurrentAccountResponse {
  status: number;
  success: boolean;
  message: string;
  data: CurrentAccount | CurrentAccount[];
}

export interface MovementResponse {
  status: number;
  success: boolean;
  message: string;
  data: CurrentAccountMovement | CurrentAccountMovement[];
}

export interface StatisticsResponse {
  status: number;
  success: boolean;
  message: string;
  data: CurrentAccountStatistics | GeneralStatistics;
}

export interface ReportResponse {
  status: number;
  success: boolean;
  message: string;
  data: CurrentAccountReport;
}

// Tipos para paginación
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Tipos para exportación
export interface ExportData {
  csv: string;
  filename: string;
}

export interface ExportResponse {
  status: number;
  success: boolean;
  message: string;
  data: ExportData;
}

// Tipos para ventas pendientes y pagos
export interface PendingSale {
  id: number;
  receipt_number: string;
  date: string;
  total: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'pending' | 'partial' | 'paid';
  branch_id: number;
}

export interface SalePayment {
  sale_id: number;
  amount: number;
}

export interface ProcessPaymentBySaleData {
  sale_payments: SalePayment[];
  payment_method_id: number;
}

// Tipos para cargos administrativos
export interface AdministrativeCharge {
  id: number;
  movement_type: string;
  description: string;
  reference: string | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  movement_date: string;
  created_at: string;
  payment_status: 'pending' | 'partial' | 'paid';
}

export interface ChargePayment {
  charge_id: number;
  amount: number;
}

export interface ProcessPaymentWithChargesData {
  sale_payments?: SalePayment[];
  charge_payments?: ChargePayment[];
  payment_method_id: number;
  branch_id?: number; // Sucursal para registrar movimiento de caja (requerido para cargos administrativos)
}


