import api from '@/lib/api';
import { 
  Shipment, 
  ShipmentStage, 
  CreateShipmentRequest, 
  MoveShipmentRequest, 
  UpdateShipmentRequest,
  UpsertShipmentStageRequest,
  ConfigureVisibilityRequest 
} from '@/types/shipment';

class ShipmentService {

  // Shipment methods
  async getShipments(filters: Record<string, any> = {}): Promise<any> {
    try {
      const response = await api.get('/shipments', { params: filters });
      
      // Normalizar la respuesta para asegurar que siempre tengamos un array
      let shipmentsData: Shipment[] = [];
      let meta: any = {};
      let stats: any = null;
      
      if (response?.data) {
        // Formato: { success: true, data: { data: [...], current_page: 1, ... }, stats: {...} }
        if (response.data.success && response.data.data) {
          const paginatedData = response.data.data;
          
          // Si tiene estructura de paginación con data anidado
          if (Array.isArray(paginatedData.data)) {
            shipmentsData = paginatedData.data;
            meta = {
              current_page: paginatedData.current_page,
              last_page: paginatedData.last_page,
              per_page: paginatedData.per_page,
              total: paginatedData.total,
              from: paginatedData.from,
              to: paginatedData.to
            };
          }
          // Si data es directamente un array
          else if (Array.isArray(paginatedData)) {
            shipmentsData = paginatedData;
          }
        }
        // Formato: { data: [...] } (array directo)
        else if (Array.isArray(response.data.data)) {
          shipmentsData = response.data.data;
          meta = response.data.meta || {};
        }
        // Formato: [...] (array directo en data)
        else if (Array.isArray(response.data)) {
          shipmentsData = response.data;
        }
        
        // Extraer estadísticas si existen
        if (response.data.stats) {
          stats = response.data.stats;
        }
      }
      
      return { data: shipmentsData, meta, stats };
    } catch (error) {
      console.error('Error fetching shipments:', error);
      // Return empty data instead of throwing to prevent app crash
      return { data: [], meta: {} };
    }
  }

  async getShipment(id: number): Promise<Shipment> {
    try {
      const response = await api.get(`/shipments/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error('Error fetching shipment:', error);
      throw error;
    }
  }

  async createShipment(data: CreateShipmentRequest, idempotencyKey?: string): Promise<Shipment> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const response = await api.post('/shipments', data, { headers });
    return response.data.data;
  }

  async updateShipment(id: number, data: UpdateShipmentRequest): Promise<Shipment> {
    const response = await api.put(`/shipments/${id}`, data);
    return response.data.data;
  }

  async deleteShipment(id: number): Promise<void> {
    await api.delete(`/shipments/${id}`);
  }

  async payShipment(id: number, data: { payment_method_id: number; notes?: string }): Promise<Shipment> {
    const response = await api.post(`/shipments/${id}/pay`, data);
    return response.data.data;
  }

  async moveShipment(id: number, data: MoveShipmentRequest, idempotencyKey?: string): Promise<Shipment> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const response = await api.patch(`/shipments/${id}/move`, data, { headers });
    return response.data.data;
  }

  async processWebhook(id: number, payload: Record<string, any>): Promise<any> {
    const response = await api.post(`/shipments/${id}/webhook`, payload);
    return response.data.data;
  }

  // Stage methods
  async getStages(): Promise<ShipmentStage[]> {
    try {
      const response = await api.get('/shipment-stages');
      
      // Manejar el formato con 'success'
      if (response?.data?.success && response.data.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }
      
      // Formato directo
      if (response?.data?.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }
      
      // Si data es directamente un array
      if (Array.isArray(response?.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching stages:', error);
      return [];
    }
  }

  async upsertStage(data: UpsertShipmentStageRequest): Promise<ShipmentStage> {
    const response = await api.post('/shipment-stages', data);
    return response.data.data;
  }

  async deleteStage(id: number): Promise<void> {
    await api.delete(`/shipment-stages/${id}`);
  }

  async configureVisibility(data: ConfigureVisibilityRequest): Promise<void> {
    await api.post('/shipment-stages/visibility', data);
  }

  // Utility methods
  generateIdempotencyKey(): string {
    return `shipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const shipmentService = new ShipmentService();
