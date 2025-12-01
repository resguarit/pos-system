import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { SaleHeader } from "@/types/sale";

interface AfipStatusBadgeProps {
  sale: SaleHeader;
  className?: string;
}

/**
 * Badge que muestra el estado de autorización AFIP de una venta
 */
export function AfipStatusBadge({ sale, className = "" }: AfipStatusBadgeProps) {
  // Verificar si es presupuesto
  const receiptType = sale.receipt_type;
  const isBudget = receiptType?.afip_code === '016' || 
                   receiptType?.name?.toLowerCase().includes('presupuesto');

  if (isBudget) {
    return null; // Los presupuestos no se autorizan con AFIP
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



