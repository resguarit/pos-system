import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { getBranchBadgeStyles } from '@/utils/branchColor';
import { cn } from '@/lib/utils';

export interface BranchBadgeProps {
  /** Nombre de la sucursal a mostrar */
  name: string;
  /** Color hex de la sucursal (usar getBranchColor() desde @/utils/branchColor si no lo tenés) */
  color: string;
  /** Clases adicionales para el Badge */
  className?: string;
  /** Si true, aplica opacidad reducida (ej. ventas/presupuestos anulados) */
  dimmed?: boolean;
}

/**
 * Badge estándar de sucursal. Usar en tablas de presupuestos, ventas, trazabilidad,
 * envíos, cuentas corrientes, historial de compras, órdenes de compra, transferencias,
 * movimientos de caja. Mantiene un solo estilo en toda la app.
 */
export function BranchBadge({ name, color, className, dimmed }: BranchBadgeProps) {
  const styles = getBranchBadgeStyles(color);
  return (
    <Badge
      variant="outline"
      className={cn('text-xs border-2 font-medium', dimmed && 'opacity-60', className)}
      style={styles}
    >
      {name}
    </Badge>
  );
}
