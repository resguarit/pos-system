import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { SaleHeader } from "@/types/sale";
import { useArcaContext } from "@/context/ArcaContext";
import { useBranch } from "@/context/BranchContext";
import { receiptTypeRequiresCustomerWithCuit, isInternalOnlyReceiptType } from "@/utils/arcaReceiptTypes";

interface ArcaStatusBadgeProps {
  sale: SaleHeader;
  className?: string;
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
export function ArcaStatusBadge({ sale, className = "" }: ArcaStatusBadgeProps) {
  const { hasCertificateForCuit } = useArcaContext();
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

  // Intentar obtener el CUIT del objeto branch de la venta
  if (typeof sale.branch === 'object' && sale.branch !== null) {
    if ('cuit' in sale.branch && sale.branch.cuit) {
      branchCuit = sale.branch.cuit;
    } else if ('id' in sale.branch && sale.branch.id) {
      // Si solo tenemos ID, buscar en las sucursales cargadas
      const branch = branches.find(b => b.id === (sale.branch as any).id);
      branchCuit = branch?.cuit;
    }
  } else if (typeof sale.branch === 'string') {
    // Si es un string (nombre de la sucursal), buscar por descripción
    const branch = branches.find(b => b.description === sale.branch);
    branchCuit = branch?.cuit;
  }

  // Si no tenemos CUIT o no hay certificado para ese CUIT, no mostramos UI de ARCA
  if (!branchCuit || !hasCertificateForCuit(branchCuit)) {
    return null;
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




