import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, Settings2 } from "lucide-react";
import type { SaleHeader } from "@/types/sale";
import { useArcaContext } from "@/context/ArcaContext";
import { useBranch } from "@/context/BranchContext";
import { receiptTypeRequiresCustomerWithCuit, isInternalOnlyReceiptType } from "@/utils/arcaReceiptTypes";

interface ArcaStatusBadgeProps {
  sale: SaleHeader;
  className?: string;
  /** Si es true, muestra un badge de configuración cuando falta certificado */
  showConfigWarning?: boolean;
}

/**
 * Obtiene el afip_code (ARCA code) del tipo de comprobante desde la venta.
 * La lista devuelve receipt_type (string) y receipt_type_code; el detalle devuelve receipt_type (objeto con afip_code).
 */
function getAfipCodeFromSale(sale: SaleHeader): string | number | null | undefined {
  const rt = sale.receipt_type;
  if (rt != null && typeof rt === 'object' && 'afip_code' in rt) {
    return (rt as { afip_code?: string | number }).afip_code;
  }
  return sale.receipt_type_code ?? null;
}

/**
 * Badge que muestra el estado de autorización ARCA de una venta.
 * No muestra nada para Presupuesto (016) ni Factura X (017) — son solo uso interno, no van a ARCA.
 */
export function ArcaStatusBadge({ sale, className = "", showConfigWarning = false }: ArcaStatusBadgeProps) {
  const { hasCertificateForCuit, validCertificates } = useArcaContext();
  const { branches } = useBranch();

  const afipCode = getAfipCodeFromSale(sale);
  const receiptType = sale.receipt_type;
  const isInternalOnly =
    isInternalOnlyReceiptType(afipCode) ||
    (typeof receiptType === 'string' && (
      receiptType.toLowerCase().includes('presupuesto') ||
      receiptType.toLowerCase().includes('factura x')
    )) ||
    (receiptType != null && typeof receiptType === 'object' && (receiptType as { name?: string }).name?.toLowerCase().includes('presupuesto'));

  if (isInternalOnly) {
    return null; // Presupuesto y Factura X son solo uso interno, no ARCA
  }

  // Verificar si hay certificado para la sucursal de esta venta
  let branchCuit: string | undefined;
  let branchName: string | undefined;

  // Intentar obtener el CUIT del objeto branch de la venta
  if (typeof sale.branch === 'object' && sale.branch !== null) {
    if ('cuit' in sale.branch && sale.branch.cuit) {
      branchCuit = sale.branch.cuit;
    }
    if ('description' in sale.branch) {
      branchName = (sale.branch as { description?: string }).description;
    }
    if (!branchCuit && 'id' in sale.branch && sale.branch.id) {
      // Si solo tenemos ID, buscar en las sucursales cargadas
      const branch = branches.find(b => b.id === (sale.branch as any).id);
      branchCuit = branch?.cuit;
      branchName = branch?.description;
    }
  } else if (typeof sale.branch === 'string') {
    // Si es un string (nombre de la sucursal), buscar por descripción
    const branch = branches.find(b => b.description === sale.branch);
    branchCuit = branch?.cuit;
    branchName = sale.branch;
  }

  // Verificar si hay algún certificado configurado en el sistema
  const hasAnyCertificates = validCertificates && validCertificates.length > 0;
  const hasCertificate = branchCuit && hasCertificateForCuit(branchCuit);

  // Si no hay certificado y no queremos mostrar advertencias, no mostramos nada
  if (!hasCertificate && !showConfigWarning) {
    return null;
  }

  // Si no hay certificado pero queremos mostrar advertencias
  if (!hasCertificate) {
    // Si la sucursal no tiene CUIT
    if (!branchCuit) {
      return (
        <Badge
          variant="outline"
          className={`border-orange-400 text-orange-600 ${className}`}
          title={`La sucursal "${branchName || 'N/A'}" no tiene CUIT configurado. Configure el CUIT en Gestión > Sucursales.`}
        >
          <Settings2 className="mr-1 h-3 w-3" />
          Sin CUIT
        </Badge>
      );
    }
    
    // Si hay CUIT pero no hay certificado
    if (!hasAnyCertificates) {
      return (
        <Badge
          variant="outline"
          className={`border-orange-400 text-orange-600 ${className}`}
          title="No hay certificados ARCA configurados en el sistema. Configure certificados en Configuración > ARCA."
        >
          <Settings2 className="mr-1 h-3 w-3" />
          Sin cert.
        </Badge>
      );
    }
    
    // Hay certificados pero no para este CUIT
    return (
      <Badge
        variant="outline"
        className={`border-orange-400 text-orange-600 ${className}`}
        title={`No hay certificado ARCA para el CUIT ${branchCuit}. Configure el certificado en Configuración > ARCA.`}
      >
        <Settings2 className="mr-1 h-3 w-3" />
        Sin cert.
      </Badge>
    );
  }

  const isAuthorized = !!sale.cae;
  const requiresCustomer = receiptTypeRequiresCustomerWithCuit(afipCode);
  const customerOk = requiresCustomer ? !!sale.customer : true;

  const totalOk = Number(sale.total) > 0;
  const canAuthorize = !isAuthorized && customerOk && totalOk;

  if (isAuthorized) {
    return (
      <Badge
        variant="default"
        className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
        title={`CAE: ${sale.cae || 'N/A'}`}
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Autorizada ARCA
      </Badge>
    );
  }

  if (canAuthorize) {
    return (
      <Badge
        variant="outline"
        className={`border-amber-500 text-amber-700 ${className}`}
        title="Pendiente de autorización ARCA"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Pendiente ARCA
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`border-gray-400 text-gray-600 ${className}`}
      title="No se puede autorizar con ARCA"
    >
      <XCircle className="mr-1 h-3 w-3" />
      No autorizable
    </Badge>
  );
}




