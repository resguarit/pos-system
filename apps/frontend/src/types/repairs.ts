export type Repair = {
  id: number;
  code: string;
  customer?: {
    id: number;
    name: string | null;
    phone?: string | null;
    email?: string | null;
  };
  branch?: { id: number; description?: string | null };
  category?: { id: number; name?: string | null };
  category_id?: number | null;
  technician?: { id: number; name: string | null };
  device: string;
  serial_number?: string | null;
  issue_description: string;
  diagnosis?: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  intake_date?: string | null;
  estimated_date?: string | null;
  cost?: number | null;
  sale_price?: number | null;
  profit_margin?: number | null;
  initial_notes?: string | null;
  sale_id?: number | null;
  sale?: { id: number; receipt_number?: string | null };
  notes?: RepairNote[];
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
  created_at?: string;
  updated_at?: string;
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
  Recibido: "Recibido",
  "En diagnóstico": "En diagnóstico",
  "Reparación Interna": "Reparación Interna",
  "Reparación Externa": "Reparación Externa",
  "Esperando repuestos": "Esperando repuestos",
  Terminado: "Terminado",
  Entregado: "Entregado",
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
  status?: RepairStatus | "all";
  priority?: RepairPriority | "all";
  technician_id?: number;
  branch_id?: number | string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
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

