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
  canAuthorize: (sale: SaleHeader) => { can: boolean; reason?: string };
  isAuthorizing: boolean;
  error: string | null;
}

/**
 * Hook para autorizar ventas con AFIP
 * 
 * @returns Funciones y estado para autorizar ventas con AFIP
 */
import { useAfipContext } from "@/context/AfipContext";
import { useBranch } from "@/context/BranchContext";
import { AFIP_CODES } from "@/lib/constants/afipCodes";
import { receiptTypeRequiresCustomerWithCuit, isValidCuitForAfip, isInternalOnlyReceiptType } from "@/utils/afipReceiptTypes";

// ... existing imports

export function useAfipAuthorization(): UseAfipAuthorizationReturn {
  const { request } = useApi();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { hasCertificateForCuit } = useAfipContext();
  const { branches } = useBranch();

  /**
   * Valida si una venta puede ser autorizada con AFIP
   */
  const canAuthorize = (sale: SaleHeader): { can: boolean; reason?: string } => {
    // Verificar certificado de la sucursal
    let branchCuit: string | undefined;

    // Intentar obtener el CUIT del objeto branch de la venta
    if (typeof sale.branch === 'object' && sale.branch !== null) {
      if ('cuit' in sale.branch && sale.branch.cuit) {
        branchCuit = sale.branch.cuit;
      } else if ('id' in sale.branch && sale.branch.id) {
        const branch = branches.find(b => b.id === (sale.branch as any).id);
        branchCuit = branch?.cuit;
      }
    } else if (typeof sale.branch === 'string') {
      // Si es un string (nombre de la sucursal), buscar por descripción
      const branch = branches.find(b => b.description === sale.branch);
      branchCuit = branch?.cuit;
    }

    if (!branchCuit || !hasCertificateForCuit(branchCuit)) {
      return { can: false, reason: 'La sucursal no posee un certificado AFIP válido configurado.' };
    }

    const receiptType = sale.receipt_type;
    const afipCode = receiptType && typeof receiptType !== 'string' ? receiptType.afip_code : null;
    const internalOnly = isInternalOnlyReceiptType(afipCode ?? undefined)
      || (typeof receiptType === 'string' && receiptType.toLowerCase().includes('presupuesto'))
      || (receiptType && typeof receiptType === 'object' && receiptType.name?.toLowerCase().includes('presupuesto'));

    if (internalOnly) {
      const reason = afipCode != null && String(afipCode) === AFIP_CODES.FACTURA_X
        ? 'La Factura X es solo de uso interno del sistema y no se autoriza con AFIP'
        : 'Los presupuestos no requieren autorización AFIP';
      return { can: false, reason };
    }

    const requiresCuit = receiptTypeRequiresCustomerWithCuit(afipCode ?? undefined);
    if (requiresCuit && !sale.customer) {
      return { can: false, reason: 'La Factura A requiere un cliente con CUIT asociado' };
    }
    if (requiresCuit && sale.customer) {
      const cuit = (sale.customer as any).person?.cuit ?? (sale.customer as any).cuit ?? '';
      if (!isValidCuitForAfip(cuit)) {
        return { can: false, reason: 'El cliente debe tener un CUIT de 11 dígitos para Factura A' };
      }
    }

    // Verificar que no tenga CAE ya
    if (sale.cae) {
      return { can: false, reason: `La venta ya está autorizada con CAE: ${sale.cae}` };
    }

    if (!sale.items || sale.items.length === 0) {
      return { can: false, reason: 'La venta debe tener al menos un ítem' };
    }

    const totalAmount = Number(sale.total);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
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
    canAuthorize,
    isAuthorizing,
    error,
  };
}



