// src/hooks/useExchangeRateUpdates.ts
import { useEffect, useRef } from 'react';
import { useRefresh } from '@/context/RefreshContext';

/**
 * Hook que ejecuta un callback cuando se dispara una actualización global.
 * @param onUpdate Callback que se ejecuta cuando se dispara la actualización.
 */
export function useExchangeRateUpdates(onUpdate: () => void) {
  const { refreshTrigger } = useRefresh();
  const onUpdateRef = useRef(onUpdate);
  const isInitialRender = useRef(true);

  // Mantener la referencia del callback actualizada
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    // Saltar la primera renderización
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Solo ejecutar si refreshTrigger > 0 (una actualización real)
    if (refreshTrigger > 0) {
      onUpdateRef.current();
    }
  }, [refreshTrigger]); // Solo depender de refreshTrigger
}
