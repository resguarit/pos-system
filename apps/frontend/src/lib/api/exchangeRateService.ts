import api from '@/lib/api';
import type { ExchangeRate } from '@/types/product';

export interface ExchangeRateResponse {
  success: boolean;
  data: {
    rate: string | number;
    from_currency: string;
    to_currency: string;
    updated_at?: string;
  };
}

/**
 * Servicio para manejar tasas de cambio
 */
const exchangeRateService = {
  /**
   * Obtiene la tasa de cambio actual entre dos monedas
   */
  async getCurrentRate(fromCurrency: string = 'USD', toCurrency: string = 'ARS'): Promise<number> {
    try {
      
      const response = await api.get<ExchangeRateResponse>(
        `/exchange-rates/current?from_currency=${fromCurrency}&to_currency=${toCurrency}`
      );
      
      
      if (response.data?.success && response.data?.data?.rate) {
        const rate = response.data.data.rate;
        
        // Asegurar que la tasa es un número válido
        const numericRate = Number(rate);
        
        if (isFinite(numericRate) && numericRate > 0) {
          return numericRate;
        }
      }
      return 1; // Valor por defecto
    } catch (error) {
      return 1; // Valor por defecto en caso de error
    }
  },

  /**
   * Obtiene todas las tasas de cambio disponibles
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    try {
      const response = await api.get<{ data: ExchangeRate[] }>('/exchange-rates');
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener tasas de cambio:', error);
      return [];
    }
  },

  /**
   * Actualiza la tasa de cambio manualmente
   */
  async updateRate(
    fromCurrency: string = 'USD', 
    toCurrency: string = 'ARS', 
    rate: number
  ): Promise<boolean> {
    try {
      const response = await api.post('/exchange-rates/update', {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate
      });
      
      return response.data?.success || false;
    } catch (error) {
      console.error('Error al actualizar tasa de cambio:', error);
      throw error;
    }
  },

  /**
   * Convierte un monto de una moneda a otra usando la tasa actual
   */
  async convertAmount(
    amount: number, 
    fromCurrency: string = 'USD', 
    toCurrency: string = 'ARS'
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    return amount * rate;
  }
};

export default exchangeRateService;
