import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import useApi from '@/hooks/useApi';
import { useRefresh } from './RefreshContext'; // Importa useRefresh

type ExchangeRateContextType = {
  rate: number | null;
  isLoading: boolean;
  refreshRate: () => Promise<void>;
};

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { request } = useApi();
  // PASO 1: Obtén el disparador de refresco global de RefreshContext
  const { refreshTrigger } = useRefresh();

  const loadRate = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await request({ method: 'GET', url: '/settings' });
      const settings = response.data?.data || response.data || [];
      const rateSetting = settings.find((s: any) => s.key === 'usd_exchange_rate');
      if (rateSetting?.value) {
        setRate(parseFloat(rateSetting.value));
      } else {
        setRate(null);
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      setRate(null);
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  // Carga inicial de datos cuando el componente se monta
  useEffect(() => {
    loadRate();
  }, [loadRate]);

  // PASO 2: Agrega un efecto que escuche al disparador global
  useEffect(() => {
    // Evita una doble búsqueda en la carga inicial, solo se ejecuta en disparos posteriores
    if (refreshTrigger > 0) {
      loadRate();
    }
  }, [refreshTrigger, loadRate]);

  // Una función para disparar manualmente un refresco local si es necesario
  const refreshRate = async () => {
    await loadRate();
  };

  return (
    <ExchangeRateContext.Provider value={{ rate, isLoading, refreshRate }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  const context = useContext(ExchangeRateContext);
  if (context === undefined) {
    throw new Error('useExchangeRate must be used within an ExchangeRateProvider');
  }
  return context;
}
