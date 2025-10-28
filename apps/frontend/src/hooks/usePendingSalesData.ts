import { useState, useEffect, useCallback } from 'react';
import { PendingSale } from '@/types/currentAccount';
import { CurrentAccountService } from '@/lib/services/currentAccountService';

interface PendingSalesData {
  [accountId: number]: {
    sales: PendingSale[];
    totalDebt: number;
    loading: boolean;
    error: string | null;
  };
}

export const usePendingSalesData = (accountIds: number[]) => {
  const [pendingSalesData, setPendingSalesData] = useState<PendingSalesData>({});

  const loadPendingSales = useCallback(async (accountId: number) => {
    setPendingSalesData(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        loading: true,
        error: null
      }
    }));

    try {
      const sales = await CurrentAccountService.getPendingSales(accountId);
      const totalDebt = sales.reduce((sum, sale) => sum + (sale.pending_amount || 0), 0);

      setPendingSalesData(prev => ({
        ...prev,
        [accountId]: {
          sales,
          totalDebt,
          loading: false,
          error: null
        }
      }));
    } catch (error) {
      console.error(`Error loading pending sales for account ${accountId}:`, error);
      setPendingSalesData(prev => ({
        ...prev,
        [accountId]: {
          sales: [],
          totalDebt: 0,
          loading: false,
          error: 'Error al cargar ventas pendientes'
        }
      }));
    }
  }, []);

  const loadAllPendingSales = useCallback(async () => {
    const promises = accountIds.map(id => loadPendingSales(id));
    await Promise.allSettled(promises);
  }, [accountIds, loadPendingSales]);

  useEffect(() => {
    if (accountIds.length > 0) {
      loadAllPendingSales();
    }
  }, [accountIds, loadAllPendingSales]);

  const getPendingDebt = useCallback((accountId: number): number => {
    return pendingSalesData[accountId]?.totalDebt || 0;
  }, [pendingSalesData]);

  const isLoading = useCallback((accountId: number): boolean => {
    return pendingSalesData[accountId]?.loading || false;
  }, [pendingSalesData]);

  const getError = useCallback((accountId: number): string | null => {
    return pendingSalesData[accountId]?.error || null;
  }, [pendingSalesData]);

  return {
    pendingSalesData,
    getPendingDebt,
    isLoading,
    getError,
    loadPendingSales,
    loadAllPendingSales
  };
};
