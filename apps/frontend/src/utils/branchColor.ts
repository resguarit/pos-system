/**
 * Utilidad centralizada para el color de sucursal.
 * Punto único de verdad: cualquier cambio de regla o valor por defecto se hace aquí.
 * Usar en: presupuestos, ventas, trazabilidad, envíos, cuentas corrientes,
 * historial de compras, órdenes de compra, transferencias, movimientos de caja.
 */

export const DEFAULT_BRANCH_COLOR = '#6b7280';

/** Estilos estándar del badge de sucursal (borde, texto, fondo con 10% opacidad) */
export function getBranchBadgeStyles(color: string): {
  borderColor: string;
  color: string;
  backgroundColor: string;
} {
  const c = color || DEFAULT_BRANCH_COLOR;
  return {
    borderColor: c,
    color: c,
    backgroundColor: `${c}10`,
  };
}

type BranchLike = { id: string | number; color?: string; [key: string]: unknown };

/**
 * Resuelve el color de una sucursal desde distintas fuentes.
 * Prioridad: branchColor (API) > branch.color > lookup por branchId en branches.
 */
export function getBranchColor(options: {
  /** Color ya enviado por el API (ej. budget.branch_color, sale con branch cargado) */
  branchColor?: string | null;
  /** ID de sucursal para buscar en la lista */
  branchId?: number | string | null;
  /** Lista de sucursales (ej. del BranchContext) para fallback */
  branches?: BranchLike[] | null;
  /** Objeto branch con color (ej. movement.branch) */
  branch?: { color?: string } | null;
}): string {
  if (options.branchColor) return options.branchColor;
  if (options.branch?.color) return options.branch.color;
  if (options.branchId != null && options.branches?.length) {
    const b = options.branches.find((x) => String(x.id) === String(options.branchId));
    return b?.color ?? DEFAULT_BRANCH_COLOR;
  }
  return DEFAULT_BRANCH_COLOR;
}
