import { useState, useEffect, useCallback } from 'react';
import { CurrentAccountService } from '@/lib/services/currentAccountService';
import type { CurrentAccount } from '@/types/currentAccount';

interface UseCustomerCreditOptions {
  customerId: number | null;
  enabled?: boolean;
}

interface CustomerCreditState {
  availableCredit: number;
  currentAccountId: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook personalizado para manejar el crédito a favor del cliente
 * 
 * Aplica principios SOLID:
 * - SRP: Solo maneja la lógica de crédito a favor
 * - OCP: Extensible para nuevas funcionalidades
 * - DIP: Depende de abstracciones (CurrentAccountService)
 * 
 * @param options - Opciones de configuración
 * @returns Estado y funciones relacionadas con el crédito
 */
export function useCustomerCredit(options: UseCustomerCreditOptions) {
  const { customerId, enabled = true } = options;

  const [state, setState] = useState<CustomerCreditState>({
    availableCredit: 0,
    currentAccountId: null,
    isLoading: false,
    error: null,
  });

  /**
   * Carga el crédito disponible del cliente
   * Usa useCallback para evitar recreaciones innecesarias
   */
  const loadCustomerCredit = useCallback(async () => {
    if (!customerId || !enabled) {
      setState({
        availableCredit: 0,
        currentAccountId: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Obtener cuenta corriente del cliente
      const currentAccount = await CurrentAccountService.getByCustomer(customerId);
      
      if (!currentAccount) {
        console.log(`[useCustomerCredit] Cliente ${customerId} no tiene cuenta corriente`);
        setState({
          availableCredit: 0,
          currentAccountId: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      console.log(`[useCustomerCredit] Cuenta corriente encontrada:`, currentAccount.id, 'Balance:', currentAccount.current_balance);

      // Obtener crédito disponible
      const credit = await CurrentAccountService.getAvailableFavorCredit(currentAccount.id);
      
      console.log(`[useCustomerCredit] Crédito disponible:`, credit);
      
      setState({
        availableCredit: credit,
        currentAccountId: currentAccount.id,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al cargar crédito del cliente';
      
      console.error('[useCustomerCredit] Error al cargar crédito del cliente:', error);
      
      setState({
        availableCredit: 0,
        currentAccountId: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  }, [customerId, enabled]);

  // Cargar crédito cuando cambia el cliente
  useEffect(() => {
    loadCustomerCredit();
  }, [loadCustomerCredit]);

  /**
   * Calcula el crédito a aplicar según el total de la venta
   * @param saleTotal - Total de la venta
   * @returns Monto de crédito a aplicar
   */
  const calculateCreditToApply = useCallback((saleTotal: number): number => {
    if (state.availableCredit <= 0 || !state.currentAccountId || saleTotal <= 0) {
      return 0;
    }
    
    return Math.min(state.availableCredit, saleTotal);
  }, [state.availableCredit, state.currentAccountId]);

  /**
   * Resetea el estado del crédito
   */
  const resetCredit = useCallback(() => {
    setState({
      availableCredit: 0,
      currentAccountId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    loadCustomerCredit,
    calculateCreditToApply,
    resetCredit,
    hasCredit: state.availableCredit > 0,
  };
}

