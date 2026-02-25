import { useState } from 'react';
import { sileo } from "sileo"
import { CurrentAccount } from '@/types/currentAccount';
import { CurrentAccountService } from '@/lib/services/currentAccountService';

export function useCurrentAccountActions() {
  const [loading, setLoading] = useState(false);

  const executeAction = async <T>(
    action: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    onSuccess?: () => void
  ): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await action();
      sileo.success({ title: successMessage });
      onSuccess?.();
      return result;
    } catch (error: any) {
      console.error('Error executing action:', error);
      // Extraer mensaje del backend si existe
      const backendMessage = error?.response?.data?.message || error?.message;
      sileo.error({ title: backendMessage || errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const suspendAccount = async (account: CurrentAccount, onSuccess?: () => void) => {
    return executeAction(
      () => CurrentAccountService.suspend(account.id, 'Suspendida por administrador'),
      'Cuenta suspendida exitosamente',
      'Error al suspender la cuenta',
      onSuccess
    );
  };

  const reactivateAccount = async (account: CurrentAccount, onSuccess?: () => void) => {
    return executeAction(
      () => CurrentAccountService.reactivate(account.id),
      'Cuenta reactivada exitosamente',
      'Error al reactivar la cuenta',
      onSuccess
    );
  };

  const closeAccount = async (account: CurrentAccount, onSuccess?: () => void) => {
    return executeAction(
      () => CurrentAccountService.close(account.id, 'Cerrada por administrador'),
      'Cuenta cerrada exitosamente',
      'Error al cerrar la cuenta',
      onSuccess
    );
  };

  const deleteAccount = async (account: CurrentAccount, onSuccess?: () => void) => {
    return executeAction(
      () => CurrentAccountService.delete(account.id),
      'Cuenta eliminada exitosamente',
      'Error al eliminar la cuenta',
      onSuccess
    );
  };

  const processPayment = async (
    accountId: number,
    paymentData: any,
    onSuccess?: () => void,
    onAfterSuccess?: () => void
  ) => {
    return executeAction(
      async () => {
        const result = await CurrentAccountService.processPayment(accountId, paymentData);
        onAfterSuccess?.();
        return result;
      },
      'Pago procesado exitosamente',
      'Error al procesar el pago',
      onSuccess
    );
  };

  const processCreditPurchase = async (
    accountId: number,
    purchaseData: any,
    onSuccess?: () => void
  ) => {
    return executeAction(
      () => CurrentAccountService.processCreditPurchase(accountId, purchaseData),
      'Compra a crédito procesada exitosamente',
      'Error al procesar la compra a crédito',
      onSuccess
    );
  };

  return {
    loading,
    suspendAccount,
    reactivateAccount,
    closeAccount,
    deleteAccount,
    processPayment,
    processCreditPurchase,
    executeAction
  };
}

