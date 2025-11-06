/**
 * Tipos de movimiento manuales permitidos:
 * 
 * CRÉDITO (Entrada - Reduce deuda o acumula crédito):
 * 1. Ajuste a favor: Bonificación/descuento (acumula crédito, NO afecta caja)
 * 2. Depósito a cuenta: Dinero real (acumula crédito, SÍ afecta caja)
 * 
 * DÉBITO (Salida - Aumenta deuda):
 * 3. Ajuste en contra: Corrección contable (aumenta deuda, NO afecta caja)
 * 4. Interés aplicado: Interés por mora (aumenta deuda, NO afecta caja)
 */
const MANUAL_MOVEMENT_NAMES = [
  // Crédito (Entrada)
  'ajuste a favor',
  'depósito a cuenta',
  'deposito a cuenta',
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
  return operationType === 'entrada' 
    ? { 
        label: 'Crédito (Entrada)', 
        description: 'Reduce la deuda del cliente o acumula crédito',
        color: 'text-green-600' 
      }
    : { 
        label: 'Débito (Salida)', 
        description: 'Aumenta la deuda del cliente',
        color: 'text-red-600' 
      };
}
