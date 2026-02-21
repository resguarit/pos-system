export interface Shipment {
  id: number;
  reference?: string;
  tracking_number?: string;
  status?: string;
  priority?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  notes?: string;
  metadata: Record<string, any>;
  current_stage_id: number;
  version?: number;
  created_by: number;
  branch_id?: number;
  tenant_id?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  shipping_cost?: number;
  is_paid?: boolean;
  payment_date?: string;
  current_stage?: ShipmentStage;
  creator?: User;
  transporter?: User;
  sales?: Sale[];
  events?: ShipmentEvent[];
}

export interface ShipmentStage {
  id: number;
  name: string;
  description?: string;
  order: number;
  config: Record<string, any>;
  is_active: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: number;
  shipment_id: number;
  user_id?: number;
  from_stage_id?: number;
  to_stage_id?: number;
  metadata: Record<string, any>;
  ip?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  from_stage?: ShipmentStage;
  to_stage?: ShipmentStage;
}

export interface ShipmentRoleAttributeVisibility {
  id: number;
  stage_id: number;
  role_id: number;
  attribute: string;
  visible: boolean;
  created_at: string;
  updated_at: string;
  stage?: ShipmentStage;
  role?: Role;
}

export interface CreateShipmentRequest {
  sale_ids: number[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  priority?: string;
  estimated_delivery_date?: string;
  notes?: string;
  shipping_cost?: number;
}

export interface MoveShipmentRequest {
  stage_id: number;
  metadata?: Record<string, any>;
  version: number;
}

export interface UpdateShipmentRequest {
  metadata?: Record<string, any>;
  version: number;
  shipping_cost?: number;
}

export interface PayShipmentRequest {
  payment_method_id: number;
  notes?: string;
}

export interface UpsertShipmentStageRequest {
  id?: number;
  name: string;
  description?: string;
  order?: number;
  config?: Record<string, any>;
  is_active?: boolean;
}

export interface ConfigureVisibilityRequest {
  stage_id: number;
  role_id: number;
  rules: Record<string, boolean>;
}

// Supporting types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role_id?: number;
  role?: Role;
  person?: {
    id: number;
    first_name: string;
    last_name: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    phone?: string;
    documento?: string;
    cuit?: string;
  };
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export interface Sale {
  id: number;
  date: string;
  receipt_number: string;
  customer_id?: number;
  subtotal: string | number;
  total_iva_amount?: string | number;
  total: number;
  paid_amount: string | number;
  pending_amount: number;
  status: string;
  payment_status?: string;
  customer?: Customer & {
    person?: {
      first_name: string;
      last_name: string;
      documento?: string;
      phone?: string;
      address?: string;
    };
  };
  receipt_type?: {
    id: number;
    description?: string;
    afip_code?: string;
    name?: string;
  };
  items?: SaleItem[];
  payments?: Array<{
    id: number;
    amount: number;
    payment_method?: {
      id: number;
      name: string;
    };
  }>;
  sale_payments?: Array<{
    id: number;
    amount: number | string;
    payment_method?: {
      id: number;
      name: string;
    };
  }>;
}

export interface SaleItem {
  id: number;
  sale_header_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  item_subtotal: number;
  item_iva: number;
  item_total: number;
  product?: {
    id: number;
    name: string;
    description?: string;
    code?: string;
  };
}

export interface Customer {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  person?: {
    first_name: string;
    last_name: string;
    documento?: string;
    phone?: string;
    address?: string;
  };
}
