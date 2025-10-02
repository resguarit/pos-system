import api from '../api';

export interface AnnulSaleRequest {
  reason?: string;
}

export interface AnnulSaleResponse {
  success: boolean;
  message: string;
  data?: {
    sale_id: number;
    refunded_amount: number;
    annulled_at: string;
  };
}

export const saleAnnulmentService = {
  annulSale: async (saleId: number, data: AnnulSaleRequest): Promise<AnnulSaleResponse> => {
    const response = await api.post(`/sales/${saleId}/annul`, data);
    return response.data;
  }
};