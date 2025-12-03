import { useState } from 'react';
import useApi from './useApi';
import { toast } from 'sonner';
import type { SaleHeader } from '@/types/sale';

interface AfipAuthorizationResult {
  cae: string | null;
  cae_expiration_date: string | null;
  invoice_number: number | null;
  point_of_sale: number | null;
  invoice_type: number | null;
}

interface UseAfipAuthorizationReturn {
  authorizeSale: (sale: SaleHeader) => Promise<AfipAuthorizationResult | null>;
  isAuthorizing: boolean;
  error: string | null;
}

/**
 * Hook para autorizar ventas con AFIP
 * 
 * @returns Funciones y estado para autorizar ventas con AFIP
 */
export function useAfipAuthorization(): UseAfipAuthorizationReturn {
  const { request } = useApi();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valida si una venta puede ser autorizada con AFIP
   */
  const canAuthorize = (sale: SaleHeader): { can: boolean; reason?: string } => {
    // Verificar que no sea presupuesto
    const receiptType = sale.receipt_type;
    if (receiptType?.afip_code === '016' || receiptType?.name?.toLowerCase().includes('presupuesto')) {
      return { can: false, reason: 'Los presupuestos no requieren autorización AFIP' };
    }

    // Verificar que tenga cliente
    if (!sale.customer) {
      return { can: false, reason: 'La venta debe tener un cliente asociado' };
    }

    // Verificar que no tenga CAE ya
    if (sale.cae) {
      return { can: false, reason: `La venta ya está autorizada con CAE: ${sale.cae}` };
    }

    // Verificar que tenga items
    if (!sale.items || sale.items.length === 0) {
      return { can: false, reason: 'La venta debe tener al menos un ítem' };
    }

    // Verificar que el total sea mayor a cero
    if (!sale.total || sale.total <= 0) {
      return { can: false, reason: 'El total de la venta debe ser mayor a cero' };
    }

    return { can: true };
  };

  /**
   * Autoriza una venta con AFIP
   */
  const authorizeSale = async (sale: SaleHeader): Promise<AfipAuthorizationResult | null> => {
    setIsAuthorizing(true);
    setError(null);

    try {
      // Validar antes de autorizar
      const validation = canAuthorize(sale);
      if (!validation.can) {
        toast.error('No se puede autorizar', {
          description: validation.reason,
        });
        setError(validation.reason || 'No se puede autorizar esta venta');
        return null;
      }

      // Llamar al endpoint
      const response = await request({
        method: 'POST',
        url: `/sales/${sale.id}/authorize-afip`,
      });

      if (response.success && response.data) {
        toast.success('Venta autorizada con AFIP', {
          description: `CAE: ${response.data.cae || 'N/A'}`,
        });

        return response.data as AfipAuthorizationResult;
      } else {
        const errorMessage = response.message || 'Error al autorizar con AFIP';
        toast.error('Error al autorizar', {
          description: errorMessage,
        });
        setError(errorMessage);
        return null;
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Error desconocido al autorizar con AFIP';
      const afipCode = err?.response?.data?.afip_code;

      let description = errorMessage;
      if (afipCode) {
        description += ` (Código AFIP: ${afipCode})`;
      }

      toast.error('Error al autorizar con AFIP', {
        description,
      });

      setError(errorMessage);
      return null;
    } finally {
      setIsAuthorizing(false);
    }
  };

  return {
    authorizeSale,
    isAuthorizing,
    error,
  };
}



