/**
 * Utilidades para formateo de monedas
 */

export interface CurrencyFormatOptions {
  showSymbol?: boolean;
  showCurrency?: boolean;
  decimals?: number;
}

/**
 * Formatea un precio con su moneda correspondiente
 */
export function formatPrice(
  amount: number | string, 
  currency: string = 'ARS', 
  options: CurrencyFormatOptions = {}
): string {
  const {
    showSymbol = true,
    showCurrency = true,
    decimals = 2
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'N/A';

  const formattedAmount = numAmount.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (!showSymbol && !showCurrency) {
    return formattedAmount;
  }

  if (currency === 'USD') {
    const symbol = showSymbol ? '$ ' : '';
    const currencyText = showCurrency ? ' USD' : '';
    return `${symbol}${formattedAmount}${currencyText}`;
  }

  // ARS por defecto
  const symbol = showSymbol ? '$' : '';
  const currencyText = showCurrency ? ' ARS' : '';
  return `${symbol}${formattedAmount}${currencyText}`;
}

/**
 * Formatea precio unitario (más compacto)
 */
export function formatUnitPrice(amount: number | string, currency: string = 'ARS'): string {
  return formatPrice(amount, currency, { showSymbol: true, showCurrency: true });
}

/**
 * Formatea precio de venta (más compacto)
 */
export function formatSalePrice(amount: number | string, currency: string = 'ARS'): string {
  return formatPrice(amount, currency, { showSymbol: true, showCurrency: true });
}

/**
 * Formatea precio para mostrar en listas (sin símbolo de moneda, solo texto)
 */
export function formatPriceWithCurrency(amount: number | string, currency: string = 'ARS'): string {
  return formatPrice(amount, currency, { showSymbol: false, showCurrency: true });
}

/**
 * Formatea precio para cálculos internos (sin símbolos)
 */
export function formatPriceNumber(amount: number | string, currency: string = 'ARS'): string {
  return formatPrice(amount, currency, { showSymbol: false, showCurrency: false });
}
