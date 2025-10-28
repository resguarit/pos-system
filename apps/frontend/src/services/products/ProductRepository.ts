import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { Product } from '@/lib/api/productService';
import { 
  ProductSearchParams, 
  ProductSearchResponse, 
  BulkUpdateStatsResponse 
} from '@/lib/api/bulkPriceService';

export class ProductRepository {
  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResponse> {
    try {
      return await bulkPriceService.searchProducts(params);
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Error al buscar productos');
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.searchProducts({});
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Error al obtener los productos');
    }
  }

  async getProductsByCategory(categoryIds: number[]): Promise<Product[]> {
    try {
      const response = await bulkPriceService.getProductsByCategories(categoryIds);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw new Error('Error al obtener productos por categoría');
    }
  }

  async getStats(params: any): Promise<BulkUpdateStatsResponse> {
    try {
      return await bulkPriceService.getStats(params);
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        stats: {
          total_products: 0,
          total_value: 0,
          average_price: 0,
        }
      };
    }
  }

  async updateProductPrices(updates: Array<{ id: number; unit_price: number }>) {
    try {
      return await bulkPriceService.bulkUpdatePrices({ updates });
    } catch (error) {
      console.error('Error updating product prices:', error);
      throw new Error('Error al actualizar los precios de los productos');
    }
  }

  async getCategories() {
    try {
      const response = await bulkPriceService.searchProducts({});
      // Extraer categorías únicas de los productos
      const categories = new Map<number, { id: number; name: string }>();
      
      if (Array.isArray(response.data)) {
        response.data.forEach(product => {
          if (product.category_id && product.category_name) {
            categories.set(Number(product.category_id), {
              id: Number(product.category_id),
              name: product.category_name
            });
          }
        });
      }
      
      return Array.from(categories.values());
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Error al obtener las categorías');
    }
  }
}
