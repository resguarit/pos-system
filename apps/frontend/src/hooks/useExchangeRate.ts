import { useState, useEffect, useCallback } from 'react';
import exchangeRateService from '@/lib/api/exchangeRateService';
import { sileo } from "sileo"
import { useRefresh } from '@/context/RefreshContext';

interface UseExchangeRateOptions {
  fromCurrency?: string;
  toCurrency?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // en minutos
}

export const useExchangeRate = (options: UseExchangeRateOptions = {}) => {
  const {
    fromCurrency = 'USD',
    toCurrency = 'ARS',
    autoRefresh = false,
    refreshInterval = 60 // 60 minutos por defecto
  } = options;

  const [rate, setRate] = useState<number | null>(null); // No inicializar con valor por defecto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Usar el contexto de refresh para actualizar automáticamente
  const { refreshTrigger } = useRefresh();

  const fetchRate = useCallback(async (showErrorToast = false) => {
    setLoading(true);
    setError(null);

    try {
      const currentRate = await exchangeRateService.getCurrentRate(fromCurrency, toCurrency);

      // Validar que la tasa sea un número válido
      if (typeof currentRate === 'number' && isFinite(currentRate) && currentRate > 0) {
        setRate(currentRate);
      } else {
        setRate(null); // No establecer valor por defecto
        setError('Tasa de cambio inválida recibida');
      }

      setLastUpdated(new Date());


    } catch (err) {
      const errorMessage = 'Error al cargar tasa de cambio';
      setError(errorMessage);

      if (showErrorToast) {
        sileo.error({ title: errorMessage });
      }

      // Usar valor por defecto
      setRate(1);
    } finally {
      setLoading(false);
    }
  }, [fromCurrency, toCurrency]);

  // Función para convertir montos
  const convertAmount = useCallback((amount: number, inverse = false): number => {
    if (!rate || rate <= 0) return amount;

    if (inverse) {
      return amount / rate; // De ARS a USD por ejemplo
    }
    return amount * rate; // De USD a ARS por ejemplo
  }, [rate]);

  // Función para formatear moneda
  const formatCurrency = useCallback((
    amount: number,
    currency: string = toCurrency,
    options: Intl.NumberFormatOptions = {}
  ): string => {
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    };

    // Para USD usar símbolo $ simple, para ARS usar $
    if (currency === 'USD') {
      return `$ ${amount.toFixed(2)}`;
    }

    return new Intl.NumberFormat('es-AR', defaultOptions).format(amount);
  }, [toCurrency]);

  // Cargar tasa inicial
  useEffect(() => {
    fetchRate(true);
  }, [fetchRate]);

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      fetchRate(false); // No mostrar toast en auto-refresh
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchRate]);

  // Escuchar cambios del contexto de refresh
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchRate(false); // No mostrar toast en refresh automático
    }
  }, [refreshTrigger, fetchRate]);

  return {
    rate,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchRate(true),
    convertAmount,
    formatCurrency,
    // Helpers útiles
    isUSDToARS: fromCurrency === 'USD' && toCurrency === 'ARS',
    hasValidRate: rate !== null && rate > 0 && rate !== 1
  };
};
