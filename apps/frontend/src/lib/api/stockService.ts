import axios from 'axios';
import { apiUrl } from '@/lib/api/config';

export interface Stock {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  min_stock?: number;
  max_stock?: number;
}

export const getStocks = async (): Promise<Stock[]> => {
  try {
    const response = await axios.get(`${apiUrl}/stocks`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    throw error;
  }
};

export const getStockByProductAndBranch = async (productId: string, branchId: string): Promise<Stock> => {
  try {
    const response = await axios.post(`${apiUrl}/stocks/by-product-branch`, {
      product_id: productId,
      branch_id: branchId
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch stock for product ${productId} and branch ${branchId}:`, error);
    throw error;
  }
};

export const updateStockQuantity = async (id: string, quantity: number): Promise<Stock> => {
  try {
    const response = await axios.patch(`${apiUrl}/stocks/${id}/quantity`, { quantity });
    return response.data;
  } catch (error) {
    console.error(`Failed to update stock quantity for id ${id}:`, error);
    throw error;
  }
};