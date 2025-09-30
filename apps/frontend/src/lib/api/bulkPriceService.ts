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
