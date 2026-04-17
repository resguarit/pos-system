export type Repair = {
  id: number;
  code: string;
  customer?: {
    id: number;
    name: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  branch?: { id: number; description?: string | null };
  category?: { id: number; name?: string | null };
  category_id?: number | null;
  technician?: { id: number; name: string | null };
  device: string;
  serial_number?: string | null;
  issue_description: string;
  diagnosis?: string | null;
  is_no_repair?: boolean;
  no_repair_reason?: string | null;
  no_repair_at?: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  intake_date?: string | null;
  estimated_date?: string | null;
  cost?: number | null;
  sale_price?: number | null;
  sale_price_without_iva?: number | null;
  iva_percentage?: number | null;
  sale_price_with_iva?: number | null;
  charge_with_iva?: boolean;
  profit_margin?: number | null;
  initial_notes?: string | null;
  sale_id?: number | null;
  sale?: { id: number; receipt_number?: string | null };
  notes?: RepairNote[];
  notes_count?: number;
  latest_note_at?: string | null;
  has_new_notes?: boolean;
  // Siniestro (Insurance Claim) fields
  is_siniestro?: boolean;
  siniestro_number?: string | null;
  insurer?: { id: number; name: string | null };
  insurer_id?: number | null;
  insured_customer?: {
    id: number;
    name: string | null;
    phone?: string | null;
    email?: string | null;
  };
  insured_customer_id?: number | null;
  policy_number?: string | null;
  device_age?: number | null;
  // Payment fields
  is_paid?: boolean;
  payment_status?: "pending" | "partial" | "paid";
  amount_paid?: number | null;
  total_paid?: number | null;
  pending_amount?: number | null;
  paid_at?: string | null;
  payment_method?: { id: number; name: string } | null;
  cash_movement_id?: number | null;
  payments?: RepairPayment[];
  external_service?: ExternalRepairService | null;
  created_at?: string;
  updated_at?: string;
};

export type RepairPayment = {
  id: number;
  amount: number;
  charge_with_iva: boolean;
  paid_at: string | null;
  is_reversed: boolean;
  reversed_at: string | null;
  payment_method?: { id: number; name: string | null } | null;
  cash_movement_id?: number | null;
};

export type ExternalRepairServicePayment = {
  id: number;
  amount: number;
  paid_at: string | null;
  notes?: string | null;
  payment_method?: { id: number; name: string | null } | null;
  current_account_movement_id?: number | null;
  user_id?: number | null;
};

export type ExternalRepairService = {
  id: number;
  repair_id: number;
  repair_code?: string | null;
  supplier_id: number;
  supplier_name?: string | null;
  current_account_id?: number | null;
  description?: string | null;
  notes?: string | null;
  agreed_cost: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: "pending" | "partial" | "paid";
  fully_paid_at?: string | null;
  charge_movement_id?: number | null;
  created_at?: string;
  updated_at?: string;
  payments?: ExternalRepairServicePayment[];
};

export type Insurer = {
  id: number;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type RepairNote = {
  id: number;
  user?: { id: number; name: string };
  note: string;
  created_at: string;
};

export const RepairStatus = {
  "Pendiente de recepción": "Pendiente de recepción",
  Recibido: "Recibido",
  "En diagnóstico": "En diagnóstico",
  "Reparación Interna": "Reparación Interna",
  "Reparación Externa": "Reparación Externa",
  "Esperando repuestos": "Esperando repuestos",
  Terminado: "Terminado",
  Entregado: "Entregado",
  Cancelado: "Cancelado",
} as const;
export type RepairStatus = typeof RepairStatus[keyof typeof RepairStatus];

export const RepairPriority = {
  Alta: "Alta",
  Media: "Media",
  Baja: "Baja",
} as const;
export type RepairPriority = typeof RepairPriority[keyof typeof RepairPriority];

export type RepairFilters = {
  search?: string;
  /** Selección múltiple de estados (si está vacío/undefined = todos). */
  statuses?: RepairStatus[];
  /** Legacy: filtro de un solo estado (se mantiene por compatibilidad). */
  status?: RepairStatus | "all";
  priority?: RepairPriority | "all";
  payment_status?: "all" | "pending" | "paid";
  technician_id?: number;
  branch_id?: number | string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  insurer_id?: number;
};

export type RepairStats = {
  total: number;
  enProceso: number;
  terminadas: number;
  entregadas: number;
};

export type KanbanColumn = {
  id: RepairStatus;
  title: string;
  items: Repair[];
};

