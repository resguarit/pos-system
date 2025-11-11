/**
 * Utilidades para filtrar tipos de movimientos
 * 
 * Centraliza la lógica de qué tipos de movimientos son automáticos vs manuales
 * y qué tipos realmente pueden estar en movimientos de caja.
 * 
 * @module movementTypeFilters
 */

/**
 * Tipo de movimiento con propiedades básicas para filtrado
 */
export interface MovementTypeForFilter {
  id?: number;
  name?: string;
  description?: string;
  is_cash_movement?: boolean;
  is_current_account_movement?: boolean;
  active?: boolean;
}

/**
 * Resultado de agrupación de tipos de movimientos
 */
export interface GroupedMovementTypes {
  manual: MovementTypeForFilter[];
  automatic: MovementTypeForFilter[];
  cash: MovementTypeForFilter[];
}

// ============================================================================
// Constantes de configuración
// ============================================================================

/**
 * Palabras clave que indican que un movimiento es automático (generado por el sistema)
 * y NO debería aparecer en el formulario de nuevo movimiento manual.
 * 
 * Se usa para buscar en descripciones (case-insensitive).
 */
const AUTOMATIC_MOVEMENT_KEYWORDS: readonly string[] = [
  // Ventas (generadas automáticamente por el sistema)
  'venta realizada en efectivo',
  'venta realizada a cuenta corriente',
  'venta registrada',
  'venta pagada',
  'venta cobrada',
  'venta realizada por',
  'ingreso por venta',
  'venta en efectivo',
  'venta a crédito',
  'venta con tarjeta',
  'venta por',
  
  // Compras (generadas automáticamente)
  'compra de mercadería',
  'compra de mercaderia',
  'compra realizada',
  
  // Pagos de cuenta corriente (generados automáticamente)
  'pago realizado a una venta',
  
  // Uso de crédito (generado automáticamente)
  'uso de crédito acumulado para pagar',
  'uso de crédito a favor del cliente en una venta',
  
  // Anulaciones (generadas automáticamente)
  'anulación de venta',
  'salida por anulación',
  
  // Notas (generadas automáticamente)
  'nota de crédito emitida',
  'nota de débito',
] as const;

/**
 * Nombres exactos de tipos que son automáticos.
 * Se usa para comparación exacta (case-insensitive).
 */
const AUTOMATIC_MOVEMENT_NAMES: readonly string[] = [
  'Venta',
  'Venta en efectivo',
  'Venta a crédito',
  'Venta con tarjeta de débito',
  'Venta con tarjeta de crédito',
  'Venta por transferencia',
  'Venta por Mercado Pago',
  'Venta por cheque',
  'Uso de crédito a favor',
  'Anulación de Venta realizada al cliente',
  'Salida por anulación de venta a crédito',
] as const;

/**
 * Palabras clave que indican que un movimiento NO puede estar en la caja
 * (solo son de cuenta corriente, no generan movimientos de caja).
 */
const NON_CASH_MOVEMENT_KEYWORDS: readonly string[] = [
  // Ajustes de cuenta corriente que no afectan caja
  'ajuste contable que beneficia',
  'ajuste contable que perjudica',
  'bonificación otorgada',
  'interés aplicado por mora',
  'interés aplicado',
  'comisión aplicada',
  'gastos administrativos aplicados',
  
  // Notas que no afectan caja directamente
  'nota de crédito emitida por devolución',
  'nota de débito por interés',
  
  // Movimientos de cuenta corriente puros
  'venta realizada a cuenta corriente',
  'compra realizada por el cliente a crédito',
] as const;

/**
 * Nombres exactos de tipos que NO pueden estar en la caja.
 */
const NON_CASH_MOVEMENT_NAMES: readonly string[] = [
  'Ajuste a favor',
  'Ajuste en contra',
  'Interés aplicado',
  'Comisión aplicada por servicios administrativos',
  'Gastos administrativos aplicados a la cuenta',
  'Nota de crédito emitida por devolución o descuento',
  'Nota de crédito emitida por devolución de mercadería',
  'Nota de débito por interés, comisiones o gastos',
  'Venta a crédito',
  'Compra realizada por el cliente a crédito (registro manual)',
] as const;

// ============================================================================
// Funciones auxiliares privadas
// ============================================================================

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
 * Verifica si un string contiene alguna de las palabras clave proporcionadas.
 * 
 * @param text - Texto a buscar
 * @param keywords - Array de palabras clave
 * @returns true si el texto contiene alguna palabra clave
 */
function containsKeyword(text: string, keywords: readonly string[]): boolean {
  const normalizedText = normalizeString(text);
  return keywords.some(keyword => normalizedText.includes(normalizeString(keyword)));
}

/**
 * Verifica si un string coincide exactamente con alguno de los nombres proporcionados.
 * 
 * @param text - Texto a comparar
 * @param names - Array de nombres exactos
 * @returns true si el texto coincide con algún nombre
 */
function matchesExactName(text: string, names: readonly string[]): boolean {
  const normalizedText = normalizeString(text);
  return names.some(name => normalizedText === normalizeString(name));
}

// ============================================================================
// Funciones públicas de verificación
// ============================================================================

/**
 * Verifica si un tipo de movimiento es automático (generado por el sistema)
 * y por lo tanto NO debería aparecer en el formulario de nuevo movimiento manual.
 * 
 * @param type - Tipo de movimiento a verificar
 * @returns true si el movimiento es automático
 * 
 * @example
 * ```ts
 * const type = { name: 'Venta en efectivo', description: 'Ingreso por venta...' };
 * isAutomaticMovementType(type); // true
 * ```
 */
export function isAutomaticMovementType(type: MovementTypeForFilter | null | undefined): boolean {
  if (!type) {
    return false;
  }
  
  const name = normalizeString(type.name);
  const description = normalizeString(type.description);
  
  // Verificar nombres exactos primero (más rápido y preciso)
  if (matchesExactName(name, AUTOMATIC_MOVEMENT_NAMES)) {
    return true;
  }
  
  // Verificar palabras clave en la descripción
  if (containsKeyword(description, AUTOMATIC_MOVEMENT_KEYWORDS)) {
    return true;
  }
  
  return false;
}

/**
 * Verifica si un tipo de movimiento puede estar en la caja.
 * 
 * Un movimiento puede estar en la caja si:
 * - Tiene `is_cash_movement = true`
 * - No es solo de cuenta corriente (sin afectar caja)
 * - No está en la lista de exclusiones por nombre o palabra clave
 * 
 * @param type - Tipo de movimiento a verificar
 * @returns true si el movimiento puede estar en la caja
 * 
 * @example
 * ```ts
 * const type = { 
 *   name: 'Gasto operativo', 
 *   is_cash_movement: true,
 *   is_current_account_movement: false 
 * };
 * isCashMovementType(type); // true
 * ```
 */
export function isCashMovementType(type: MovementTypeForFilter | null | undefined): boolean {
  if (!type) {
    return false;
  }
  
  // Si explícitamente no es movimiento de caja, excluir
  if (type.is_cash_movement === false) {
    return false;
  }
  
  // Si es solo de cuenta corriente (sin afectar caja), excluir
  if (type.is_current_account_movement === true && type.is_cash_movement !== true) {
    return false;
  }
  
  const name = normalizeString(type.name);
  const description = normalizeString(type.description);
  
  // Verificar nombres exactos que NO pueden estar en caja
  if (matchesExactName(name, NON_CASH_MOVEMENT_NAMES)) {
    return false;
  }
  
  // Verificar palabras clave que indican que NO puede estar en caja
  if (containsKeyword(description, NON_CASH_MOVEMENT_KEYWORDS) || 
      containsKeyword(name, NON_CASH_MOVEMENT_KEYWORDS)) {
    return false;
  }
  
  // Por defecto, si tiene is_cash_movement = true, puede estar en caja
  return type.is_cash_movement === true;
}

// ============================================================================
// Funciones públicas de filtrado
// ============================================================================

/**
 * Filtra tipos de movimiento de CAJA para mostrar solo los que son manuales
 * (excluye los automáticos generados por el sistema).
 * 
 * Esta función es específica para movimientos de caja. Para cuenta corriente,
 * usa `filterManualCurrentAccountMovementTypes` de `movementTypeUtils.ts`.
 * 
 * @param movementTypes - Array de tipos de movimiento a filtrar
 * @returns Array filtrado con solo tipos manuales de caja
 * 
 * @example
 * ```ts
 * const types = [
 *   { name: 'Venta en efectivo', description: '...' },
 *   { name: 'Gasto operativo', description: '...' }
 * ];
 * filterManualCashMovementTypes(types); 
 * // [{ name: 'Gasto operativo', description: '...' }]
 * ```
 */
export function filterManualCashMovementTypes(
  movementTypes: MovementTypeForFilter[]
): MovementTypeForFilter[] {
  if (!Array.isArray(movementTypes)) {
    return [];
  }
  
  return movementTypes.filter(type => !isAutomaticMovementType(type));
}

/**
 * Filtra tipos de movimiento para mostrar solo los que son automáticos.
 * 
 * @param movementTypes - Array de tipos de movimiento a filtrar
 * @returns Array filtrado con solo tipos automáticos
 */
export function filterAutomaticMovementTypes(
  movementTypes: MovementTypeForFilter[]
): MovementTypeForFilter[] {
  if (!Array.isArray(movementTypes)) {
    return [];
  }
  
  return movementTypes.filter(type => isAutomaticMovementType(type));
}

/**
 * Filtra tipos de movimiento para mostrar solo los que pueden estar en la caja
 * (excluye tipos que son solo de cuenta corriente y nunca aparecen en CashMovement).
 * 
 * @param movementTypes - Array de tipos de movimiento a filtrar
 * @returns Array filtrado con solo tipos que pueden estar en la caja
 * 
 * @example
 * ```ts
 * const types = [
 *   { name: 'Nota de débito', is_cash_movement: false },
 *   { name: 'Gasto operativo', is_cash_movement: true }
 * ];
 * filterCashMovementTypes(types); 
 * // [{ name: 'Gasto operativo', is_cash_movement: true }]
 * ```
 */
export function filterCashMovementTypes(
  movementTypes: MovementTypeForFilter[]
): MovementTypeForFilter[] {
  if (!Array.isArray(movementTypes)) {
    return [];
  }
  
  return movementTypes.filter(type => isCashMovementType(type));
}

// ============================================================================
// Funciones de agrupación
// ============================================================================

/**
 * Obtiene tipos de movimiento agrupados por categoría.
 * 
 * @param movementTypes - Array de tipos de movimiento a agrupar
 * @returns Objeto con tipos agrupados en manual, automatic y cash
 * 
 * @example
 * ```ts
 * const types = [/* ... tipos ... *\/];
 * const grouped = groupMovementTypesByCategory(types);
 * // {
 * //   manual: [...],
 * //   automatic: [...],
 * //   cash: [...]
 * // }
 * ```
 */
export function groupMovementTypesByCategory(
  movementTypes: MovementTypeForFilter[]
): GroupedMovementTypes {
  if (!Array.isArray(movementTypes)) {
    return {
      manual: [],
      automatic: [],
      cash: [],
    };
  }
  
  return {
    manual: filterManualCashMovementTypes(movementTypes),
    automatic: filterAutomaticMovementTypes(movementTypes),
    cash: filterCashMovementTypes(movementTypes),
  };
}
