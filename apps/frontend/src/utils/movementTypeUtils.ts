import { MovementType } from '@/types/currentAccount';

/**
 * Lista de nombres de tipos de movimiento que son automáticos y no deben mostrarse
 * en diálogos de creación manual de movimientos
 */
const AUTOMATIC_MOVEMENT_NAMES = [
  'venta',
  'pago de venta',
  'pago en efectivo',
  'pago con tarjeta',
  'pago con transferencia',
  'compra de mercadería',
  'compra de mercaderia',
  'pago de cuenta corriente',
  'pago cuenta corriente',
  'uso de crédito a favor', // Movimiento automático cuando se usa crédito en una venta
  'uso de credito a favor'
] as const;

/**
 * Determina si un tipo de movimiento es automático (no debe aparecer en creación manual)
 * 
 * @param movementType - Tipo de movimiento a evaluar
 * @returns true si el movimiento es automático, false si es manual
 */
export function isAutomaticMovement(movementType: MovementType): boolean {
  const name = movementType.name.toLowerCase();
  return AUTOMATIC_MOVEMENT_NAMES.some(automaticName => name.includes(automaticName));
}

/**
 * Filtra tipos de movimiento para mostrar solo los que pueden ser creados manualmente
 * 
 * @param movementTypes - Array de tipos de movimiento a filtrar
 * @returns Array filtrado con solo tipos de movimiento manuales
 */
export function filterManualMovementTypes(movementTypes: MovementType[]): MovementType[] {
  return movementTypes.filter(type => !isAutomaticMovement(type));
}

/**
 * Obtiene el título y descripción según el tipo de operación
 * 
 * @param operationType - Tipo de operación ('entrada' o 'salida')
 * @returns Objeto con título y descripción
 */
export function getOperationTypeInfo(operationType: 'entrada' | 'salida') {
  return {
    isCredit: operationType === 'entrada',
    title: operationType === 'entrada' ? 'Agregar Crédito' : 'Agregar Débito',
    description: operationType === 'entrada'
      ? 'Registrar un movimiento que reduce la deuda (pago, nota de crédito, ajuste a favor)'
      : 'Registrar un movimiento que aumenta la deuda (compra, nota de débito, ajuste en contra)'
  };
}

