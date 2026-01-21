import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { SaleHeader } from "@/types/sale";
import { useAfipContext } from "@/context/AfipContext";
import { useBranch } from "@/context/BranchContext";

interface AfipStatusBadgeProps {
  sale: SaleHeader;
  className?: string;
}

/**
 * Badge que muestra el estado de autorización AFIP de una venta
 */
export function AfipStatusBadge({ sale, className = "" }: AfipStatusBadgeProps) {
  const { hasCertificateForCuit } = useAfipContext();
  const { branches } = useBranch();

  // Verificar si es presupuesto
  const receiptType = sale.receipt_type;
  const isBudget = receiptType?.afip_code === '016' ||
    receiptType?.name?.toLowerCase().includes('presupuesto');

  if (isBudget) {
    return null; // Los presupuestos no se autorizan con AFIP
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

  // Si no tenemos CUIT o no hay certificado para ese CUIT, no mostramos UI de AFIP
  if (!branchCuit || !hasCertificateForCuit(branchCuit)) {
    return null;
  }

  // Verificar si está autorizada
  const isAuthorized = !!sale.cae;

  // Verificar si puede ser autorizada
  const canAuthorize = !isAuthorized &&
    !!sale.customer &&
    sale.items &&
    sale.items.length > 0 &&
    sale.total &&
    sale.total > 0;

  if (isAuthorized) {
    return (
      <Badge
        variant="default"
        className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
        title={`CAE: ${sale.cae || 'N/A'}`}
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Autorizada AFIP
      </Badge>
    );
  }

  if (canAuthorize) {
    return (
      <Badge
        variant="outline"
        className={`border-amber-500 text-amber-700 ${className}`}
        title="Pendiente de autorización AFIP"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Pendiente AFIP
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`border-gray-400 text-gray-600 ${className}`}
      title="No se puede autorizar con AFIP"
    >
      <XCircle className="mr-1 h-3 w-3" />
      No autorizable
    </Badge>
  );
}



