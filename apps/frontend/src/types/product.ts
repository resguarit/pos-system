// Definición de tipos para las entidades relacionadas con productos
export interface Measure {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number | null;
  parent?: {
    id: number;
    name: string;
  };
  children?: Category[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IVA {
  id: number;
  name: string; // Added name property
  rate: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string;
  email: string;
  cuit: string;
  address: string;
  status: string;
  person_type_id?: number;
  person_id?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  current_account?: {
    id: number;
    current_balance: string | number;
    // Add other fields if needed
  };
  tax_identities?: SupplierTaxIdentity[];
}

export interface SupplierTaxIdentity {
  id?: number;
  supplier_id?: number;
  cuit: string;
  business_name: string;
  fiscal_condition_id: number | string;
  is_default: boolean;
  cbu: string;
  cbu_alias: string;
  bank_name: string;
  account_holder: string;
}

export interface Branch {
  id: number;
  name?: string;
  description?: string;
  address: string;
  phone: string;
  color?: string;
  email?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Stock {
  id: number;
  branch_id: number;
  product_id: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  branch?: Branch;
}

export interface Product {
  id: number;
  description: string;
  code: string; // Changed from number to string to match usage
  measure_id: number;
  unit_price: string;
  currency: 'USD' | 'ARS'; // Tipo específico para monedas soportadas
  markup: string; // Se almacena como decimal en el backend (ej: 0.20 para 20%)
  category_id: number;
  iva_id: number;
  image_id: number | null;
  supplier_id: number;
  status: boolean | number;
  web: boolean | number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sale_price: number; // Precio calculado dinámicamente en ARS
  // Relaciones
  measure: Measure;
  category: Category;
  iva: IVA;
  supplier: Supplier;
  stocks?: Stock[]; // Relación con stocks (puede tener múltiples stocks en diferentes sucursales)
}

// Interface para la tasa de cambio
export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

// Interface para el historial de costos de productos
export interface ProductCostHistory {
  id: number;
  product_id: number;
  previous_cost: number | null;
  new_cost: number;
  currency: 'USD' | 'ARS';
  source_type: 'purchase_order' | 'manual' | 'bulk_update' | 'bulk_update_by_category' | 'bulk_update_by_supplier' | null;
  source_id: number | null;
  notes: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  product?: Product;
  user?: {
    id: number;
    email: string;
    person?: {
      first_name: string;
      last_name: string;
    };
  };
  // Atributos calculados
  percentage_change?: number | null;
  absolute_change?: number;
}

// Interface para la respuesta del historial de costos de un producto
export interface ProductCostHistoryResponse {
  status: number;
  success: boolean;
  message: string;
  data: {
    product: {
      id: number;
      description: string;
      code: string;
      current_cost: number;
      currency: 'USD' | 'ARS';
    };
    history: ProductCostHistory[];
  };
}