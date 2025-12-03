import api from '@/lib/api';

export interface Stock {
  id: string;
  product_id: string;
  branch_id: string;
  current_stock: number;
  quantity?: number;
  min_stock?: number;
  max_stock?: number;
}

export const getStocks = async (): Promise<Stock[]> => {
  try {
    const response = await api.get('/stocks');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    throw error;
  }
};

export const getStockByProductAndBranch = async (productId: number | string, branchId: number | string): Promise<Stock | null> => {
  try {
    const response = await api.post('/stocks/by-product-branch', {
      product_id: productId,
      branch_id: branchId
    });
    return response.data.data || response.data;
  } catch (error: any) {
    // Si no hay stock, devolver null en lugar de lanzar error
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Failed to fetch stock for product ${productId} and branch ${branchId}:`, error);
    throw error;
  }
};

export const updateStockQuantity = async (id: string, quantity: number): Promise<Stock> => {
  try {
    const response = await api.patch(`/stocks/${id}/quantity`, { quantity });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Failed to update stock quantity for id ${id}:`, error);
    throw error;
  }
};