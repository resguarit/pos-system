export type Repair = {
  id: number;
  code: string;
  customer?: { id: number; name: string | null };
  branch?: { id: number; description?: string | null };
  technician?: { id: number; name: string | null };
  device: string;
  serial_number?: string | null;
  issue_description: string;
  status: RepairStatus;
  priority: RepairPriority;
  estimated_date?: string | null;
  cost?: number | null;
  sale_id?: number | null;
  sale?: { id: number; receipt_number?: string | null };
};
export const RepairStatus = {
  Recibido: "Recibido",
  "En diagnóstico": "En diagnóstico",
  "En reparación": "En reparación",
  "Esperando repuestos": "Esperando repuestos",
  Terminado: "Terminado",
  Entregado: "Entregado",
} as const
export type RepairStatus = typeof RepairStatus[keyof typeof RepairStatus]

export const RepairPriority = {
  Alta: "Alta",
  Media: "Media",
  Baja: "Baja",
} as const
export type RepairPriority = typeof RepairPriority[keyof typeof RepairPriority]
