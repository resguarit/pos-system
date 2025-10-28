/**
 * Utilidades centralizadas para cálculos de precios
 * Evita violaciones del principio DRY
 */

export type UpdateType = 'percentage' | 'fixed';

/**
 * Calcula el nuevo precio basado en el tipo de actualización y valor
 * Función centralizada para evitar duplicación de código
 */
export const calculateNewPrice = (
  currentPrice: number | string, 
  type: UpdateType, 
  value: number
): number => {
  const price = Number(currentPrice) || 0;
  
  switch (type) {
    case 'percentage':
      return price * (1 + value / 100);
    case 'fixed':
      return price + value;
    default:
      return price;
  }
};

/**
 * Calcula el precio de venta basado en precio unitario, markup e IVA
 */
export const calculateSalePrice = (
  unitPrice: number, 
  currency: string, 
  markup: number, 
  ivaRate: number
): number => {
  const markupAmount = unitPrice * markup;
  const subtotal = unitPrice + markupAmount;
  const ivaAmount = subtotal * ivaRate;
  return subtotal + ivaAmount;
};

/**
 * Calcula el markup basado en precio unitario, precio de venta e IVA
 */
export const calculateMarkup = (
  unitPrice: number, 
  currency: string, 
  salePrice: number, 
  ivaRate: number
): number => {
  if (unitPrice === 0) return 0;
  
  const subtotal = salePrice / (1 + ivaRate);
  const markupAmount = subtotal - unitPrice;
  return markupAmount / unitPrice;
};

/**
 * Calcula el markup desde el precio de venta
 */
export const calculateMarkupFromSalePrice = (salePrice: number): number => {
  // Implementación específica según la lógica de negocio
  return salePrice * 0.1; // Ejemplo: 10% por defecto
};

/**
 * Valida si un valor de actualización es válido
 */
export const isValidUpdateValue = (
  value: string, 
  type: UpdateType
): boolean => {
  const numericValue = Number(value);
  
  if (isNaN(numericValue)) return false;
  
  if (type === 'percentage') {
    return numericValue >= -100 && numericValue <= 1000;
  }
  
  return true;
};

/**
 * Genera un mensaje de error para valores inválidos
 */
export const getValidationErrorMessage = (type: UpdateType): string => {
  if (type === 'percentage') {
    return 'El porcentaje debe estar entre -100% y 1000%';
  }
  return 'Por favor ingresa un valor válido';
};

/**
 * Aplica descuento a un precio
 */
export const applyDiscount = (price: number, discountPercentage: number): number => {
  return price * (1 - discountPercentage / 100);
};

/**
 * Aplica incremento a un precio
 */
export const applyIncrement = (price: number, incrementPercentage: number): number => {
  return price * (1 + incrementPercentage / 100);
};

/**
 * Calcula el precio con IVA incluido
 */
export const calculatePriceWithIVA = (price: number, ivaRate: number): number => {
  return price * (1 + ivaRate);
};

/**
 * Calcula el precio sin IVA
 */
export const calculatePriceWithoutIVA = (price: number, ivaRate: number): number => {
  return price / (1 + ivaRate);
};

/**
 * Redondea un precio de manera inteligente según su magnitud
 * Misma lógica que en crear/editar productos
 * - Precios < 1000: redondear a múltiplos de 10
 * - Precios >= 1000: redondear a múltiplos de 100
 */
export const roundPrice = (price: number): number => {
  if (price < 1000) {
    return Math.round(price / 10) * 10;
  }
  return Math.round(price / 100) * 100;
};

/**
 * Valida si un precio es válido
 */
export const isValidPrice = (price: number | string): boolean => {
  const numericPrice = Number(price);
  return !isNaN(numericPrice) && numericPrice >= 0;
};



