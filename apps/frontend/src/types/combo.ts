// types/combo.ts
import type { Product } from './product';

export interface Combo {
  id: number;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  combo_items?: ComboItem[];
  groups?: ComboGroup[];
}

export interface ComboGroup {
  id: number;
  combo_id: number;
  name: string;
  required_quantity: number;
  options?: ComboGroupOption[];
}

export interface ComboGroupOption {
  id: number;
  combo_group_id: number;
  product_id: number;
  product?: Product;
}

export interface ComboItem {
  id: number;
  combo_id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface ComboPriceCalculation {
  base_price: number;
  discount_amount: number;
  final_price: number;
  items_breakdown: ComboItemBreakdown[];
  combo: Combo;
}

export interface ComboItemBreakdown {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ComboAvailability {
  is_available: boolean;
  max_quantity: number;
  limiting_products: LimitingProduct[];
}

export interface LimitingProduct {
  product: Product;
  reason: string;
  available: number;
  required: number;
  max_combo_quantity?: number;
}

export interface ComboDisplayInfo {
  id: number;
  name: string;
  description?: string;
  is_combo: true;
  base_price: number;
  discount_amount: number;
  final_price: number;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  is_available: boolean;
  max_quantity: number;
  components: ComboItemBreakdown[];
  limiting_products: LimitingProduct[];
}

// Extender el tipo CartItem para incluir combos
export interface CartItem {
  id: string;
  product_id?: number; // ✅ Campo requerido para el backend
  code: string;
  name: string;
  price: number;
  price_with_iva: number;
  sale_price: number;
  iva_rate: number;
  quantity: number;
  image: string;
  currency: string;
  iva?: { id: number; rate: number; };
  allow_discount?: boolean;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  // Campos específicos para combos
  is_combo?: boolean;
  combo_id?: number;
  combo_data?: ComboDisplayInfo;
  // Campos para productos que vienen de combos
  is_from_combo?: boolean;
  combo_name?: string;
  original_combo_price?: number;
  combo_discount_applied?: number;
}

export interface CreateComboRequest {
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  is_active?: boolean;
  items?: ComboItemRequest[];
  groups?: ComboGroupRequest[];
}

export interface ComboGroupRequest {
  name: string;
  required_quantity: number;
  options: ComboGroupOptionRequest[];
}

export interface ComboGroupOptionRequest {
  product_id: number;
}

export interface ComboItemForm {
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface ComboItemRequest {
  product_id: number;
  quantity: number;
}

export interface UpdateComboRequest extends Partial<CreateComboRequest> {
  id: number;
}
