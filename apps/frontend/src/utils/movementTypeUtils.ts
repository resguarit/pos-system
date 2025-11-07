/**
 * Tipos de movimiento manuales permitidos:
 * 
 * DÉBITO (Salida - Aumenta deuda):
 * - Ajuste en contra: Corrección contable (aumenta deuda, NO afecta caja)
 * - Interés aplicado: Interés por mora (aumenta deuda, NO afecta caja)
 */
const MANUAL_MOVEMENT_NAMES = [
  // Débito (Salida)
  'ajuste en contra',
  'interés aplicado',
  'interes aplicado',
] as const;

/**
 * Filtra tipos de movimiento para mostrar solo los tipos manuales permitidos
 */
export function filterManualMovementTypes(movementTypes: any[]): any[] {
  return movementTypes.filter(type => {
    const name = type.name.toLowerCase().trim();
    // Incluir solo movimientos manuales permitidos
    return MANUAL_MOVEMENT_NAMES.some(manualName => name === manualName || name.includes(manualName));
  });
}

/**
 * Obtiene información del tipo de operación (entrada/salida)
 */
export function getOperationTypeInfo(operationType: 'entrada' | 'salida') {
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
