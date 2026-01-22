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
        `/exchange-rate/current?from_currency=${fromCurrency}&to_currency=${toCurrency}`
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
    } catch (error: any) {
      // Si es un error 404 o no hay datos, usar valor por defecto sin mostrar error
      if (error?.response?.status === 404 || error?.response?.data?.message?.includes('No exchange rate found')) {
        return 1; // Valor por defecto
      }
      console.warn('Error al obtener tasa de cambio:', error?.response?.data?.message || error?.message);
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
      const response = await api.post('/exchange-rate/update', {
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
  },

  /**
   * Obtiene estadísticas de productos en USD antes de actualizar precios
   */
  async getUSDProductsStats(): Promise<{
    count: number;
    totalValue: number;
  }> {
    try {
      const response = await api.get('/exchange-rate/usd-products-stats');

      if (response.data?.success) {
        return {
          count: response.data.data?.count || 0,
          totalValue: response.data.data?.total_value || 0
        };
      }

      return { count: 0, totalValue: 0 };
    } catch (error) {
      console.error('Error al obtener estadísticas de productos USD:', error);
      return { count: 0, totalValue: 0 };
    }
  },

  /**
   * Actualiza precios de productos en USD cuando cambia la tasa de cambio
   */
  async updateUSDProductPrices(newUSDRate: number): Promise<{
    success: boolean;
    updatedCount: number;
    message: string;
  }> {
    try {
      const response = await api.post('/exchange-rate/update-prices', {
        new_usd_rate: newUSDRate
      });

      if (response.data?.success) {
        return {
          success: true,
          updatedCount: response.data.data?.updated_count || 0,
          message: response.data.message || 'Precios actualizados exitosamente'
        };
      }

      return {
        success: false,
        updatedCount: 0,
        message: response.data?.message || 'Error al actualizar precios'
      };
    } catch (error) {
      console.error('Error al actualizar precios de productos USD:', error);
      throw error;
    }
  }
};

export default exchangeRateService;
