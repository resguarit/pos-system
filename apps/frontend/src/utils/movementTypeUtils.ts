/**
 * Utilidades para tipos de movimiento de cuenta corriente
 * 
 * Este módulo contiene funciones específicas para filtrar y trabajar con
 * tipos de movimientos de cuenta corriente, que tienen reglas diferentes
 * a los movimientos de caja.
 * 
 * @module movementTypeUtils
 */

/**
 * Tipo de movimiento con propiedades básicas para filtrado
 */
export interface MovementTypeForFilter {
  id?: number;
  name?: string;
  description?: string;
  operation_type?: 'entrada' | 'salida';
}

/**
 * Información sobre el tipo de operación
 */
export interface OperationTypeInfo {
  label: string;
  description: string;
  color: string;
}

/**
 * Tipos de movimiento manuales permitidos para cuenta corriente.
 * 
 * Estos son los únicos tipos que pueden ser creados manualmente por el usuario
 * en el contexto de cuenta corriente.
 * 
 * DÉBITO (Salida - Aumenta deuda):
 * - Ajuste en contra: Corrección contable (aumenta deuda, NO afecta caja)
 * - Interés aplicado: Interés por mora (aumenta deuda, NO afecta caja)
 */
const MANUAL_MOVEMENT_NAMES: readonly string[] = [
  // Débito (Salida)
  'ajuste en contra',
  'interés aplicado',
  'interes aplicado',
] as const;

/**
 * Normaliza un string para comparación (lowercase y trim).
 * 
 * @param str - String a normalizar
 * @returns String normalizado o string vacío si es null/undefined
 */
function normalizeString(str: string | null | undefined): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Filtra tipos de movimiento de CUENTA CORRIENTE para mostrar solo los tipos manuales permitidos.
 * 
 * Esta función usa una lista blanca (whitelist) - solo incluye tipos específicos que están
 * permitidos para ser creados manualmente en cuenta corriente.
 * 
 * Para movimientos de caja, usa `filterManualCashMovementTypes` de `movementTypeFilters.ts`.
 * 
 * @param movementTypes - Array de tipos de movimiento a filtrar
 * @returns Array filtrado con solo tipos manuales permitidos para cuenta corriente
 * 
 * @example
 * ```ts
 * const types = [
 *   { name: 'Ajuste en contra', description: '...' },
 *   { name: 'Venta', description: '...' }
 * ];
 * filterManualCurrentAccountMovementTypes(types); 
 * // [{ name: 'Ajuste en contra', description: '...' }]
 * ```
 */
export function filterManualCurrentAccountMovementTypes(
  movementTypes: MovementTypeForFilter[]
): MovementTypeForFilter[] {
  if (!Array.isArray(movementTypes)) {
    return [];
  }
  
  return movementTypes.filter(type => {
    if (!type || !type.name) {
      return false;
    }
    
    const normalizedName = normalizeString(type.name);
    
    // Incluir solo movimientos manuales permitidos (lista blanca)
    return MANUAL_MOVEMENT_NAMES.some(
      manualName => normalizedName === normalizeString(manualName) || 
                     normalizedName.includes(normalizeString(manualName))
    );
  });
}

/**
 * Obtiene información del tipo de operación (entrada/salida).
 * 
 * @param operationType - Tipo de operación ('entrada' o 'salida')
 * @returns Objeto con información del tipo de operación (label, description, color)
 * 
 * @example
 * ```ts
 * getOperationTypeInfo('salida');
 * // {
 * //   label: 'Débito (Salida)',
 * //   description: 'Aumenta la deuda del cliente',
 * //   color: 'text-red-600'
 * // }
 * ```
 */
export function getOperationTypeInfo(
  operationType: 'entrada' | 'salida'
): OperationTypeInfo {
  return operationType === 'salida' 
    ? { 
        label: 'Débito (Salida)', 
        description: 'Aumenta la deuda del cliente',
        color: 'text-red-600' 
      }
    : { 
        label: 'Crédito (Entrada)', 
        description: 'Reduce la deuda del cliente',
        color: 'text-green-600' 
      };
}
