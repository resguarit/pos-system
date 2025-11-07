/**
 * Parsea el costo de envío correctamente desde cualquier formato
 * @param cost - El costo que puede venir como number, string, null o undefined
 * @returns El valor numérico del costo, o 0 si no es válido
 */
export function parseShippingCost(cost: number | string | null | undefined): number {
  if (cost === null || cost === undefined) return 0;
  
  // Si es número, usarlo directamente
  if (typeof cost === 'number') return cost;
  
  // Si es string, parsearlo como número decimal
  if (typeof cost === 'string') {
    // Remover espacios y caracteres no numéricos excepto punto, coma y signo menos
    const cleaned = cost.trim().replace(/[^\d.,-]/g, '');
    
    // Si está vacío después de limpiar, retornar 0
    if (!cleaned) return 0;
    
    // Si tiene coma como separador decimal (formato argentino: 2.000,00)
    if (cleaned.includes(',')) {
      // Remover separadores de miles (puntos) y convertir coma a punto
      const withoutThousands = cleaned.replace(/\./g, '');
      const withDot = withoutThousands.replace(',', '.');
      const parsed = parseFloat(withDot);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Si tiene punto como separador decimal (formato inglés: 2000.00)
    // o es un número simple sin separadores
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

