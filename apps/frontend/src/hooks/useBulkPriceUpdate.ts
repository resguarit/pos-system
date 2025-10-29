import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { BulkUpdateStatsResponse, ProductSearchParams } from '@/lib/api/bulkPriceService';
import { 
  isValidUpdateValue, 
  getValidationErrorMessage,
  UpdateType as PriceUpdateType
} from '@/utils/priceCalculations';
import {
  toggleProductSelection as toggleSelection,
  selectAllProducts as selectAll,
  deselectAllProducts as deselectAll,
  EMPTY_SET,
  EMPTY_ARRAY,
  DEFAULT_PAGE_SIZE
} from '@/utils/bulkPriceUpdate';
import { ERROR_MESSAGES, getErrorMessage } from '@/constants/errorMessages';
import type { 
  UseBulkPriceUpdateProps, 
  UseBulkPriceUpdateReturn, 
  FilterState, 
  PaginationState 
} from '@/types/bulkPriceUpdate';
import { ProductRepository } from '@/services/products/ProductRepository';
import { 
  PriceUpdateContext, 
  PercentageUpdateStrategy, 
  FixedUpdateStrategy 
} from '@/services/products/priceUpdate/PriceUpdateStrategy';

export const useBulkPriceUpdate = ({ onSuccess }: UseBulkPriceUpdateProps = {}): UseBulkPriceUpdateReturn => {
  // Estados principales
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(EMPTY_SET);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState<BulkUpdateStatsResponse['stats'] | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    last_page: 1,
    per_page: DEFAULT_PAGE_SIZE,
    total: 0,
    from: null,
    to: null,
  });

  // Estados de filtros
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    supplierIds: EMPTY_ARRAY,
    categoryIds: EMPTY_ARRAY,
  });

  // Estados de actualización
  const [updateType, setUpdateType] = useState<PriceUpdateType>('percentage');
  const [updateValue, setUpdateValue] = useState('');
  
  // Inicializar repositorio y contexto de actualización
  const productRepository = useMemo(() => new ProductRepository(), []);
  const priceUpdateContext = useMemo(() => {
    return new PriceUpdateContext(
      updateType === 'percentage' 
        ? new PercentageUpdateStrategy(0) 
        : new FixedUpdateStrategy(0)
    );
  }, [updateType]);

  // Memoized computed values
  const selectedProductsCount = useMemo(() => selectedProducts.size, [selectedProducts]);
  
  const hasSelectedProducts = useMemo(() => selectedProductsCount > 0, [selectedProductsCount]);
  
  const isValidUpdateValueComputed = useMemo(() => {
    return isValidUpdateValue(updateValue, updateType);
  }, [updateValue, updateType]);

  // Funciones de búsqueda
  const searchProducts = useCallback(async (page = 1, filtersToUse = filters) => {
    setLoading(true);
    try {
      const params: ProductSearchParams = {
        page,
        per_page: pagination.per_page,
        search: filtersToUse.search || '',
        supplier_ids: filtersToUse.supplierIds,
        category_ids: filtersToUse.categoryIds,
      };

      const response = await productRepository.searchProducts(params);
      setProducts(response.data || []);
      setPagination(response.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: pagination.per_page,
        total: 0,
        from: null,
        to: null,
      });
    } catch (error: any) {
      toast.error(getErrorMessage(error, ERROR_MESSAGES.SEARCH_PRODUCTS));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.per_page, productRepository]);

  const getStats = useCallback(async (filtersToUse = filters) => {
    try {
      const params = { ...filtersToUse };
      const response = await productRepository.getStats(params);
      setStats(response.stats);
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      setStats({
        total_products: 0,
        total_value: 0,
        average_price: 0,
      });
    }
  }, [filters]);

  // Funciones de selección de productos
  const toggleProductSelection = useCallback((productId: number) => {
    setSelectedProducts(prev => toggleSelection(productId, prev));
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(selectAll(products));
  }, [products]);

  const deselectAllProducts = useCallback(() => {
    setSelectedProducts(deselectAll());
  }, []);

  // Funciones de filtros
  const applyFilters = useCallback(() => {
    setSelectedProducts(EMPTY_SET);
    searchProducts(1);
    getStats();
  }, [searchProducts, getStats]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      supplierIds: EMPTY_ARRAY,
      categoryIds: EMPTY_ARRAY,
    });
    setSelectedProducts(EMPTY_SET);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Funciones de paginación
  const handlePageChange = useCallback((page: number) => {
    searchProducts(page);
  }, [searchProducts]);

  const handlePerPageChange = useCallback((perPage: number) => {
    setPagination(prev => ({ ...prev, per_page: perPage }));
    searchProducts(1);
  }, [searchProducts]);

  // Función para calcular el nuevo precio según el tipo de actualización
  const calculateNewPrice = useCallback((currentPrice: number, type: PriceUpdateType, value: number): number => {
    const strategy = type === 'percentage' 
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);
      
    return strategy.calculateNewPrice(currentPrice);
  }, []);

  // Funciones de actualización de precios usando el patrón Strategy
  const updatePrices = useCallback(async () => {
    if (!updateValue || !isValidUpdateValueComputed) {
      toast.error(getValidationErrorMessage(updateType));
      return;
    }

    if (!hasSelectedProducts) {
      toast.error(ERROR_MESSAGES.SELECT_PRODUCTS);
      return;
    }

    const value = Number(updateValue);
    
    // Configurar la estrategia según el tipo de actualización
    const strategy = updateType === 'percentage' 
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);
      
    priceUpdateContext.setStrategy(strategy);
    
    // Validar la estrategia
    const validation = priceUpdateContext.validate();
    if (!validation.isValid) {
      toast.error(validation.error || 'Error de validación');
      return;
    }

    setUpdating(true);
    
    try {
      // Obtener los productos seleccionados con sus precios actuales
      const productsToUpdate = products
        .filter(product => selectedProducts.has(product.id))
        .map(product => ({
          id: product.id,
          currentPrice: Number(product.unit_price ?? 0)
        }));
      
      // Aplicar la actualización
      const result = await priceUpdateContext.applyBulkUpdate(productsToUpdate);
      
      if (result.success) {
        toast.success(result.message);
        if (result.failed_updates && result.failed_updates.length > 0) {
          toast.warning(`${result.failed_updates.length} productos no se pudieron actualizar`);
        }
        onSuccess?.();
        resetState();
      } else {
        toast.error(result.message || ERROR_MESSAGES.UPDATE_PRICES);
      }
    } catch (error: any) {
      console.error('Error actualizando precios:', error);
      toast.error(getErrorMessage(error, ERROR_MESSAGES.UPDATE_PRICES));
    } finally {
      setUpdating(false);
    }
  }, [
    updateValue, 
    isValidUpdateValueComputed, 
    updateType, 
    hasSelectedProducts, 
    selectedProducts, 
    products, 
    onSuccess, 
    priceUpdateContext
  ]);

  // Función para resetear el estado
  const resetState = useCallback(() => {
    setSelectedProducts(EMPTY_SET);
    setFilters({
      search: '',
      supplierIds: EMPTY_ARRAY,
      categoryIds: EMPTY_ARRAY,
    });
    setUpdateValue('');
  }, []);

  // Retornar el estado y las funciones del hook
  return {
    // Estados
    products,
    selectedProducts,
    loading,
    updating,
    stats,
    pagination,
    filters,
    updateType: updateType as 'percentage' | 'fixed',
    updateValue,
    
    // Estados calculados
    selectedProductsCount,
    hasSelectedProducts,
    isValidUpdateValue: isValidUpdateValueComputed,
    
    // Funciones de búsqueda
    searchProducts,
    getStats,
    
    // Funciones de selección
    toggleProductSelection,
    selectAllProducts,
    deselectAllProducts,
    
    // Funciones de filtros
    applyFilters,
    clearFilters,
    updateFilters,
    
    // Funciones de paginación
    handlePageChange,
    handlePerPageChange,
    
    // Funciones de actualización
    calculateNewPrice: (currentPrice: number, type: 'percentage' | 'fixed', value: number) => {
      return calculateNewPrice(currentPrice, type, value);
    },
    updatePrices,
    setUpdateType: (type: 'percentage' | 'fixed') => setUpdateType(type as PriceUpdateType),
    setUpdateValue,
    
    // Utilidades
    resetState,
  };
};
