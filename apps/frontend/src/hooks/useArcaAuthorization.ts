import { useState } from 'react';
import useApi from './useApi';
import { sileo } from "sileo"
import type { SaleHeader } from '@/types/sale';
import { useArcaContext } from "@/context/ArcaContext";
import { useBranch } from "@/context/BranchContext";
import { ARCA_CODES } from "@/lib/constants/arcaCodes";
import { receiptTypeRequiresCustomerWithCuit, isValidCuitForArca, isInternalOnlyReceiptType, validateEmisionRulesForRI } from "@/utils/arcaReceiptTypes";

interface ArcaAuthorizationResult {
  cae: string | null;
  cae_expiration_date: string | null;
  invoice_number: number | null;
  point_of_sale: number | null;
  invoice_type: number | null;
}

interface UseArcaAuthorizationReturn {
  authorizeSale: (sale: SaleHeader) => Promise<ArcaAuthorizationResult | null>;
  canAuthorize: (sale: SaleHeader) => { can: boolean; reason?: string };
  isAuthorizing: boolean;
  error: string | null;
}

/**
 * Hook para autorizar ventas con ARCA
 * 
 * @returns Funciones y estado para autorizar ventas con ARCA
 */
export function useArcaAuthorization(): UseArcaAuthorizationReturn {
  const { request } = useApi();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { hasCertificateForCuit } = useArcaContext();
  const { branches } = useBranch();

  const getAfipCodeFromUnknown = (value: unknown): string | number | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const code = (value as { afip_code?: unknown }).afip_code;
    if (typeof code === 'string' || typeof code === 'number') return code;
    return undefined;
  };

  const getFriendlyArcaErrorMessage = (rawMessage: string, afipCode?: string | number | null): string => {
    const normalizedCode = afipCode != null ? String(afipCode) : '';
    const normalizedMessage = rawMessage.toLowerCase();

    // AFIP/ARCA 10070: ImpNeto > 0 requiere desglose IVA.
    // En la práctica suele deberse a productos sin IVA correctamente configurado
    // o ventas sin alícuotas cargadas.
    if (
      normalizedCode === '10070' ||
      normalizedMessage.includes('10070') ||
      normalizedMessage.includes('si impneto es mayor a 0 el objeto iva es obligatorio')
    ) {
      return 'No se pudo autorizar porque la venta tiene productos sin IVA configurado o sin alícuota válida. Revisá el IVA de los productos y volvé a intentar.';
    }

    return rawMessage;
  };

  /**
   * Valida si una venta puede ser autorizada con ARCA
   */
  const canAuthorize = (sale: SaleHeader): { can: boolean; reason?: string } => {
    // Verificar certificado de la sucursal
    let branchCuit: string | undefined;
    const saleBranch = sale.branch;

    // Intentar obtener el CUIT del objeto branch de la venta
    if (typeof saleBranch === 'object' && saleBranch !== null) {
      if ('cuit' in saleBranch && saleBranch.cuit) {
        branchCuit = saleBranch.cuit;
      } else if ('id' in saleBranch && saleBranch.id) {
        const branch = branches.find(b => b.id === saleBranch.id);
        branchCuit = branch?.cuit;
      }
    } else if (typeof saleBranch === 'string') {
      // Si es un string (nombre de la sucursal), buscar por descripción
      const branch = branches.find(b => b.description === saleBranch);
      branchCuit = branch?.cuit;
    }

    // Fallback: usar branch_id de la venta para buscar en el contexto
    if (!branchCuit && sale.branch_id) {
      const branch = branches.find(b => b.id === sale.branch_id);
      branchCuit = branch?.cuit;
    }

    if (!branchCuit || !hasCertificateForCuit(branchCuit)) {
      return { can: false, reason: 'La sucursal no posee un certificado ARCA válido configurado.' };
    }

    const receiptType = sale.receipt_type;
    const afipCode = receiptType && typeof receiptType !== 'string' ? receiptType.afip_code : null;
    const internalOnly = isInternalOnlyReceiptType(afipCode ?? undefined)
      || (typeof receiptType === 'string' && receiptType.toLowerCase().includes('presupuesto'))
      || (receiptType && typeof receiptType === 'object' && receiptType.name?.toLowerCase().includes('presupuesto'));

    if (internalOnly) {
      const reason = afipCode != null && String(afipCode) === ARCA_CODES.FACTURA_X
        ? 'La Factura X es solo de uso interno del sistema y no se autoriza con ARCA'
        : 'Los presupuestos no requieren autorización ARCA';
      return { can: false, reason };
    }

    // Validar reglas de emisión (RI -> Monotributista = Factura A, etc)
    const customerFiscalCondition = sale.customer && typeof sale.customer === 'object'
      ? (sale.customer as { fiscal_condition?: unknown }).fiscal_condition
      : undefined;
    const receiverCondition = getAfipCodeFromUnknown(sale.sale_fiscal_condition) ??
      getAfipCodeFromUnknown(sale.customer?.tax_identities?.[0]?.fiscal_condition) ??
      getAfipCodeFromUnknown(customerFiscalCondition);

    if (afipCode && receiverCondition) {
      const emisionValidation = validateEmisionRulesForRI(String(afipCode), Number(receiverCondition));
      if (!emisionValidation.isValid && emisionValidation.message) {
        return { can: false, reason: emisionValidation.message };
      }
    }

    const requiresCuit = receiptTypeRequiresCustomerWithCuit(afipCode ?? undefined);
    if (requiresCuit && !sale.customer) {
      return { can: false, reason: 'La Factura A requiere un cliente con CUIT asociado' };
    }
    if (requiresCuit && sale.customer) {
      const customerWithOptionalCuit = sale.customer as SaleHeader['customer'] & { cuit?: string };
      const cuit = customerWithOptionalCuit.person?.cuit ?? customerWithOptionalCuit.cuit ?? '';
      if (!isValidCuitForArca(cuit)) {
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
   * Autoriza una venta con ARCA
   */
  const authorizeSale = async (sale: SaleHeader): Promise<ArcaAuthorizationResult | null> => {
    setIsAuthorizing(true);
    setError(null);

    sileo.info({ title: 'Solicitando autorización a ARCA...' });

    try {
      // Validar antes de autorizar
      const validation = canAuthorize(sale);
      if (!validation.can) {
        sileo.error({
          title: 'No se puede autorizar',
          description: validation.reason,
        });
        setError(validation.reason || 'No se puede autorizar esta venta');
        return null;
      }

      const response = await request({
        method: 'POST',
        url: `/sales/${sale.id}/authorize-afip`,
      });

      if (response.success && response.data) {
        const toastTitle = response.message || 'Comprobante autorizado con ARCA';
        sileo.success({
          title: toastTitle,
          description: `CAE: ${response.data.cae || 'N/A'}`,
        });

        return response.data as ArcaAuthorizationResult;
      } else {
        const errorMessage = getFriendlyArcaErrorMessage(response.message || 'Error al autorizar con ARCA');
        sileo.error({
          title: 'Error al autorizar',
          description: errorMessage,
        });
        setError(errorMessage);
        return null;
      }
    } catch (err: unknown) {
      const parsedErr = err as {
        message?: string;
        response?: { data?: { afip_code?: string | number; message?: string } };
      };
      const afipCode = parsedErr?.response?.data?.afip_code;
      const rawErrorMessage = parsedErr?.response?.data?.message || parsedErr?.message || 'Error desconocido al autorizar con ARCA';
      const errorMessage = getFriendlyArcaErrorMessage(rawErrorMessage, afipCode);

      let description = errorMessage;
      if (afipCode) {
        description += ` (Código ARCA: ${afipCode})`;
      }

      sileo.error({
        title: 'Error al autorizar con ARCA',
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
