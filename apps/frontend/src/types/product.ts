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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Branch {
  id: number;
  name?: string;
  description?: string;
  address: string;
  phone: string;
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