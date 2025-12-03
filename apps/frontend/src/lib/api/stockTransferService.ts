import api from '@/lib/api';
import type {
  StockTransfer,
  CreateStockTransferRequest,
  UpdateStockTransferRequest,
  StockTransferFilters,
} from '@/types/stockTransfer';

export const stockTransferService = {
  /**
   * Get all stock transfers with optional filters
   */
  async getAll(filters?: StockTransferFilters): Promise<StockTransfer[]> {
    const response = await api.get('/stock-transfers', { params: filters });
    return response.data;
  },

  /**
   * Get a stock transfer by ID
   */
  async getById(id: number): Promise<StockTransfer> {
    const response = await api.get(`/stock-transfers/${id}`);
    return response.data;
  },

  /**
   * Create a new stock transfer
   */
  async create(data: CreateStockTransferRequest): Promise<StockTransfer> {
    const response = await api.post('/stock-transfers', data);
    return response.data;
  },

  /**
   * Update an existing stock transfer
   */
  async update(id: number, data: UpdateStockTransferRequest): Promise<StockTransfer> {
    const response = await api.put(`/stock-transfers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a stock transfer
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/stock-transfers/${id}`);
  },

  /**
   * Complete a stock transfer (execute the stock movement)
   */
  async complete(id: number): Promise<{ message: string; transfer: StockTransfer }> {
    const response = await api.patch(`/stock-transfers/${id}/complete`);
    return response.data;
  },

  /**
   * Cancel a stock transfer
   */
  async cancel(id: number): Promise<{ message: string; transfer: StockTransfer }> {
    const response = await api.patch(`/stock-transfers/${id}/cancel`);
    return response.data;
  },
};
