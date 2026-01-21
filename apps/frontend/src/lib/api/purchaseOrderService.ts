import api from "@/lib/api";

// Local type definitions to ensure availability
export interface PurchaseOrderItem {
  product_id: number;
  quantity: number;
  purchase_price: number;
}
export interface PurchaseOrderPayment {
  purchase_order_id?: number;
  payment_method_id: number;
  amount: number;
  payment_method?: { id: number; name: string };
}
export interface PurchaseOrder {
  id?: number;
  supplier_id?: number;
  branch_id?: number;
  currency?: 'ARS' | 'USD';
  supplier?: { id: number; name: string; contact_name?: string };
  branch?: { id: number; description: string };
  status?: 'pending' | 'completed' | 'cancelled';
  order_date: string;
  created_at?: string;
  notes?: string;
  total_amount?: number | string;
  total?: string;
  items?: PurchaseOrderItem[];
  payments?: PurchaseOrderPayment[];
  payment_method_id?: number; // Deprecated
  payment_method?: { id: number; name: string }; // Deprecated
  affects_cash_register?: boolean;
}
export interface CreatePurchaseOrder {
  supplier_id: number;
  branch_id: number;
  currency: 'ARS' | 'USD';
  order_date: string; // yyyy-MM-dd
  notes?: string;
  items: PurchaseOrderItem[];
  payments?: { payment_method_id: number; amount: number }[];
  payment_method_id?: number; // Optional for backward compatibility but discouraged
  affects_cash_register?: boolean;
}
export interface PurchaseSummaryByCurrency {
  from: string;
  to: string;
  totals: {
    [key: string]: number;
  };
}

export interface CancelPreviewStockChange {
  product_id: number;
  product_name: string;
  quantity_to_revert: number;
  current_stock: number;
  stock_after_revert: number;
  will_be_negative: boolean;
}

export interface CancelPreviewCashMovement {
  id: number;
  amount: number;
  payment_method: string;
  affects_balance: boolean;
  description: string;
}

export interface CancelPreviewData {
  order: {
    id: number;
    supplier_name: string;
    branch_name: string;
    order_date: string;
    total_amount: number | string;
    currency: string;
  };
  stock_changes: CancelPreviewStockChange[];
  cash_movements: CancelPreviewCashMovement[];
  cash_movement?: CancelPreviewCashMovement | null; // Deprecated
}

/**
 * Objeto que agrupa todos los métodos del servicio de órdenes de compra.
 */
const purchaseOrderService = {
  /**
   * Obtiene todas las órdenes de compra, con filtros opcionales.
   */
  async getAll(params?: { supplier_id?: number; branch_id?: number; status?: string; from?: string; to?: string }): Promise<PurchaseOrder[]> {
    try {
      const response = await api.get<PurchaseOrder[]>('/purchase-orders', { params });
      return response.data;
    } catch (error) {
      console.error("Error al obtener las órdenes de compra:", error);
      throw error;
    }
  },

  /**
   * Obtiene una orden de compra específica por su ID.
   */
  async getById(id: number): Promise<PurchaseOrder> {
    try {
      const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener la orden de compra con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crea una nueva orden de compra.
   */
  async create(purchaseOrder: CreatePurchaseOrder): Promise<PurchaseOrder> {
    try {
      const response = await api.post<PurchaseOrder>('/purchase-orders', purchaseOrder);
      return response.data;
    } catch (error) {
      console.error("Error al crear la orden de compra:", error);
      throw error;
    }
  },

  /**
   * Actualiza una orden de compra existente.
   */
  async update(id: number, purchaseOrder: Partial<CreatePurchaseOrder>): Promise<PurchaseOrder> {
    try {
      const response = await api.put<PurchaseOrder>(`/purchase-orders/${id}`, purchaseOrder);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar la orden de compra con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Elimina una orden de compra.
   */
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/purchase-orders/${id}`);
    } catch (error) {
      console.error(`Error al eliminar la orden de compra con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Marca una orden de compra como completada y registra el movimiento de caja.
   */
  async finalize(id: number, cashRegisterId: number): Promise<any> {
    try {
      const response = await api.patch(`/purchase-orders/${id}/finalize`, {
        cash_register_id: cashRegisterId
      });
      return response.data;
    } catch (error) {
      console.error(`Error al finalizar la orden de compra con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Marca una orden de compra como cancelada.
   */
  async cancel(id: number): Promise<PurchaseOrder> {
    try {
      const response = await api.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`Error al cancelar la orden de compra con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene la URL del PDF de una orden de compra. showPrices controla si se muestran precios.
   */
  getPdfUrl(id: number, options?: { showPrices?: boolean }): string {
    const base = (api.defaults.baseURL || '').replace(/\/$/, '')
    const query = new URLSearchParams()
    if (options?.showPrices === false) query.set('show_prices', '0')
    else query.set('show_prices', '1')
    return `${base}/purchase-orders/${id}/pdf?${query.toString()}`
  },

  async openPdf(id: number, options?: { showPrices?: boolean }) {
    try {
      const response = await api.get(`/purchase-orders/${id}/pdf`, {
        params: { show_prices: options?.showPrices === false ? 0 : 1 },
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orden-compra-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (error) {
      console.error('Error al descargar PDF de OC:', error)
      throw error
    }
  },

  /**
   * Obtiene el resumen de compras por moneda para un rango de fechas.
   */
  async getSummaryByCurrency(from: string, to: string): Promise<PurchaseSummaryByCurrency> {
    try {
      const response = await api.get('/purchase-orders/summary-by-currency', {
        params: { from, to }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch purchase summary by currency:', error);
      throw error;
    }
  },

  /**
   * Obtiene el preview de cancelación para órdenes completadas
   */
  async getCancelPreview(id: number): Promise<CancelPreviewData> {
    try {
      const response = await api.get<CancelPreviewData>(`/purchase-orders/${id}/cancel-preview`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener preview de cancelación para orden ${id}:`, error);
      throw error;
    }
  },
};

// ====================================================================
//  EXPORTACIONES PARA MÁXIMA COMPATIBILIDAD
// ====================================================================

// 1. Exporta el objeto completo para los archivos que lo usan directamente.
export { purchaseOrderService };

// 2. Exporta las funciones con nombres más descriptivos y la función `getAll` para compatibilidad.
export const { getAll } = purchaseOrderService;
export const getPurchaseOrders = purchaseOrderService.getAll;
export const getPurchaseOrderById = purchaseOrderService.getById;
export const createPurchaseOrder = purchaseOrderService.create;
export const updatePurchaseOrder = purchaseOrderService.update;
export const deletePurchaseOrder = purchaseOrderService.delete;
export const finalizePurchaseOrder = purchaseOrderService.finalize;
export const cancelPurchaseOrder = purchaseOrderService.cancel;
export const getPurchaseOrderPdfUrl = purchaseOrderService.getPdfUrl;
export const openPurchaseOrderPdf = purchaseOrderService.openPdf;
export const getPurchaseSummaryByCurrency = purchaseOrderService.getSummaryByCurrency;
export const getCancelPreview = purchaseOrderService.getCancelPreview;