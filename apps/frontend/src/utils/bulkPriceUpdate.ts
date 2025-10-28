import { formatPrice as formatCurrency } from '@/lib/utils/currency';
import { 
  calculateNewPrice, 
  isValidUpdateValue, 
  getValidationErrorMessage,
  roundPrice,
  isValidPrice
} from '@/utils/priceCalculations';
import { UPDATE_TYPES, PERCENTAGE_LIMITS } from '@/types/bulkPriceUpdate';

/**
 * Constantes para evitar violaciones DRY
 */
export const EMPTY_SET = new Set<number>();
export const EMPTY_ARRAY: number[] = [];
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 25;

/**
 * Formatea un precio según la moneda especificada (wrapper para consistencia)
 */
export const formatPrice = (price: number, currency: string = 'ARS'): string => {
  return formatCurrency(price, currency);
};

/**
 * Crea un objeto de actualización de precio con precio redondeado
 */
export const createPriceUpdate = (
  productId: number, 
  currentPrice: number, 
  updateType: 'percentage' | 'fixed', 
  updateValue: number
) => ({
  id: productId,
  unit_price: roundPrice(calculateNewPrice(currentPrice, updateType, updateValue))
});

/**
 * Filtra productos por texto de búsqueda
 */
export const filterProductsBySearch = (products: any[], searchText: string): any[] => {
  if (!searchText.trim()) return products;
  
  const query = searchText.toLowerCase();
  return products.filter(product => 
    product.description?.toLowerCase().includes(query) ||
    product.code?.toLowerCase().includes(query) ||
    product.category?.name?.toLowerCase().includes(query) ||
    product.supplier?.name?.toLowerCase().includes(query)
  );
};

/**
 * Calcula estadísticas de productos
 */
export const calculateProductStats = (products: any[]): {
  total_products: number;
  total_value: number;
  average_price: number;
} => {
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.unit_price || 0), 0);
  const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;
  
  return {
    total_products: totalProducts,
    total_value: totalValue,
    average_price: averagePrice
  };
};

/**
 * Genera un ID único para elementos de lista
 */
export const generateUniqueId = (): string => {
  return `bulk-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Debounce function para optimizar búsquedas
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function para optimizar eventos frecuentes
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Valida si un producto está seleccionado
 */
export const isProductSelected = (productId: number, selectedProducts: Set<number>): boolean => {
  return selectedProducts.has(productId);
};

/**
 * Toggle de selección de producto
 */
export const toggleProductSelection = (
  productId: number, 
  selectedProducts: Set<number>
): Set<number> => {
  const newSelected = new Set(selectedProducts);
  if (newSelected.has(productId)) {
    newSelected.delete(productId);
  } else {
    newSelected.add(productId);
  }
  return newSelected;
};

/**
 * Selecciona todos los productos de una lista
 */
export const selectAllProducts = (products: any[]): Set<number> => {
  return new Set(products.map(product => product.id));
};

/**
 * Deselecciona todos los productos
 */
export const deselectAllProducts = (): Set<number> => {
  return EMPTY_SET;
};
