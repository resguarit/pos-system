import api from '../api';

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
  data: any[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface BulkUpdateStatsResponse {
  success: boolean;
  stats: {
    total_products: number;
    total_value: number;
    average_price: number;
  };
}

export const bulkPriceService = {
  /**
   * Actualiza precios de múltiples productos de forma masiva
   */
  async bulkUpdatePrices(request: BulkPriceUpdateRequest): Promise<BulkPriceUpdateResponse> {
    try {
      const response = await api.post('/products/bulk-update-prices', request);
      return response.data;
    } catch (error: any) {
      console.error('Error en actualización masiva de precios:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Error al actualizar precios masivamente');
    }
  },

  /**
   * Actualiza precios por categoría
   */
  async updatePricesByCategory(
    categoryIds: number[], 
    updateType: 'percentage' | 'fixed', 
    value: number
  ): Promise<BulkPriceUpdateResponse> {
    try {
      const response = await api.post('/products/bulk-update-prices-by-category', {
        category_ids: categoryIds,
        update_type: updateType,
        value: value
      });
      return response.data;
    } catch (error: any) {
      console.error('Error en actualización masiva por categoría:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Error al actualizar precios por categoría');
    }
  },

  /**
   * Actualiza precios por proveedor
   */
  async updatePricesBySupplier(
    supplierIds: number[], 
    updateType: 'percentage' | 'fixed', 
    value: number
  ): Promise<BulkPriceUpdateResponse> {
    try {
      const response = await api.post('/bulksupplier', {
        supplier_ids: supplierIds,
        update_type: updateType,
        value: value
      });
      return response.data;
    } catch (error: any) {
      console.error('Error en actualización masiva por proveedor:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Error al actualizar precios por proveedor');
    }
  },

  /**
   * Búsqueda optimizada de productos para actualización masiva
   */
  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResponse> {
    try {
      const response = await api.get('/bulksearch', {
        params: params
      });
      return response.data;
    } catch (error: any) {
      console.error('Error buscando productos:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Error al buscar productos');
    }
  },

  /**
   * Obtiene estadísticas de productos para filtros
   */
  async getStats(params: Omit<ProductSearchParams, 'page' | 'per_page' | 'product_ids'>): Promise<BulkUpdateStatsResponse> {
    try {
      const response = await api.get('/bulkstats', {
        params: params
      });
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Error al obtener estadísticas');
    }
  },

  /**
   * Obtiene productos por categorías para preview de cambios
   */
  async getProductsByCategories(categoryIds: number[]): Promise<any[]> {
    try {
      const response = await api.get('/products/by-categories', {
        params: { category_ids: categoryIds }
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error obteniendo productos por categorías:', error);
      throw new Error('Error al obtener productos por categorías');
    }
  }
};
