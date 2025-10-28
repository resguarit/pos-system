// Tipos específicos para el sistema de actualización masiva de precios

export interface Product {
  id: number;
  description: string;
  code: string;
  unit_price: number;
  currency: string;
  category?: {
    id: number;
    name: string;
  };
  supplier?: {
    id: number;
    name: string;
  };
  status: boolean;
}

export interface FilterState {
  search: string;
  supplierIds: number[];
  categoryIds: number[];
  branchId?: number;
}

export interface PaginationState {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface BulkUpdateStats {
  total_products: number;
  total_value: number;
  average_price: number;
}

export interface ProductSearchParams {
  search?: string;
  supplier_ids?: number[];
  category_ids?: number[];
  product_ids?: number[];
  page?: number;
  per_page?: number;
  branch_id?: number;
}

export interface ProductSearchResponse {
  success: boolean;
  data: Product[];
  pagination: PaginationState;
}

export interface BulkUpdateStatsResponse {
  success: boolean;
  stats: BulkUpdateStats;
}

export interface BulkPriceUpdate {
  id: number;
  unit_price: number;
}

export interface BulkPriceUpdateRequest {
  updates: BulkPriceUpdate[];
}

export interface BulkPriceUpdateResponse {
  success: boolean;
  updated_count: number;
  failed_updates?: Array<{
    product_id: number;
    error: string;
  }>;
  message: string;
}

// Tipos para componentes específicos
export interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelection: (productId: number) => void;
  newPrice?: number;
  showNewPrice?: boolean;
}

export interface StatsCardProps {
  stats: BulkUpdateStats;
}

export interface UpdateConfigurationProps {
  updateType: 'percentage' | 'fixed';
  updateValue: string;
  selectedProductsCount: number;
  isValidUpdateValue: boolean;
  updating: boolean;
  onUpdateTypeChange: (type: 'percentage' | 'fixed') => void;
  onUpdateValueChange: (value: string) => void;
  onUpdatePrices: () => void;
  onCancel: () => void;
}

// Tipos para hooks
export interface UseBulkPriceUpdateProps {
  onSuccess?: () => void;
}

export interface UseBulkPriceUpdateReturn {
  // Estados
  products: Product[];
  selectedProducts: Set<number>;
  loading: boolean;
  updating: boolean;
  stats: BulkUpdateStats | null;
  pagination: PaginationState;
  filters: FilterState;
  updateType: 'percentage' | 'fixed';
  updateValue: string;
  
  // Computed values
  selectedProductsCount: number;
  hasSelectedProducts: boolean;
  isValidUpdateValue: boolean;
  
  // Funciones de búsqueda
  searchProducts: (page?: number, filtersToUse?: FilterState) => Promise<void>;
  getStats: (filtersToUse?: FilterState) => Promise<void>;
  
  // Funciones de selección
  toggleProductSelection: (productId: number) => void;
  selectAllProducts: () => void;
  deselectAllProducts: () => void;
  
  // Funciones de filtros
  applyFilters: () => void;
  clearFilters: () => void;
  updateFilters: (newFilters: Partial<FilterState>) => void;
  
  // Funciones de paginación
  handlePageChange: (page: number) => void;
  handlePerPageChange: (perPage: number) => void;
  
  // Funciones de actualización
  calculateNewPrice: (currentPrice: number, type: 'percentage' | 'fixed', value: number) => number;
  updatePrices: () => Promise<void>;
  
  // Setters
  setUpdateType: (type: 'percentage' | 'fixed') => void;
  setUpdateValue: (value: string) => void;
  
  // Utilidades
  resetState: () => void;
}

// Constantes
export const UPDATE_TYPES = {
  PERCENTAGE: 'percentage' as const,
  FIXED: 'fixed' as const,
} as const;

export const PER_PAGE_OPTIONS = [25, 50, 100] as const;

export const PERCENTAGE_LIMITS = {
  MIN: -100,
  MAX: 1000,
} as const;



