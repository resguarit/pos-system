import api from "@/lib/api";

export interface PaymentMethod {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Servicio para manejar métodos de pago
 */
const paymentMethodService = {
  /**
   * Obtiene todos los métodos de pago activos
   */
  async getAll(): Promise<PaymentMethod[]> {
    try {
      const response = await api.get<{ data: PaymentMethod[] }>('/payment-methods');
      return response.data.data.filter(method => method.is_active);
    } catch (error) {
      console.error("Error al obtener métodos de pago:", error);
      throw error;
    }
  },

  /**
   * Obtiene un método de pago específico por ID
   */
  async getById(id: number): Promise<PaymentMethod> {
    try {
      const response = await api.get<{ data: PaymentMethod }>(`/payment-methods/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error al obtener método de pago con ID ${id}:`, error);
      throw error;
    }
  }
};

export default paymentMethodService;
