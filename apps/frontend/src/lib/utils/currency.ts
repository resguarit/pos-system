/**
 * Utilidades para formateo de monedas
 */

export interface NumberFormatOptions {
  /**
   * Máxima cantidad de decimales a mostrar.
   * - Enteros: 0 decimales.
   * - Fraccionarios: hasta `maxDecimals`.
   */
  maxDecimals?: number;
}

export interface CurrencyFormatOptions {
  showSymbol?: boolean;
  showCurrency?: boolean;
  decimals?: number;
}

function toNumber(value: number | string): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

function isEffectivelyInteger(n: number): boolean {
  // Evita casos como 1.00000000002 por errores de punto flotante
  return Math.abs(n - Math.round(n)) < 1e-9;
}

/**
 * Formatea un número en estilo argentino:
 * - separador de miles: '.'
 * - separador decimal: ','
 * - decimales "según valor": 0 si es entero; si no, hasta `maxDecimals`
 */
export function formatNumberAR(
  value: number | string,
  options: NumberFormatOptions = {}
): string {
  const { maxDecimals = 2 } = options;
  const num = toNumber(value);
  if (Number.isNaN(num)) return 'N/A';

  const maximumFractionDigits = Math.max(0, maxDecimals);
  const minimumFractionDigits = isEffectivelyInteger(num) ? 0 : Math.min(1, maximumFractionDigits);

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
}

/**
 * Formatea dinero en estilo argentino, con decimales "según valor".
 * No usa `style: 'currency'` para mantener control fino de decimales.
 */
export function formatMoneyAR(
  amount: number | string,
  currency: string = 'ARS',
  options: Omit<CurrencyFormatOptions, 'decimals'> & NumberFormatOptions = {}
): string {
  const {
    showSymbol = true,
    showCurrency = true,
    maxDecimals = 2,
  } = options;

  const numAmount = toNumber(amount);
  if (Number.isNaN(numAmount)) return 'N/A';

  const formattedAmount = formatNumberAR(numAmount, { maxDecimals });

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

  const numAmount = toNumber(amount);
  
  if (Number.isNaN(numAmount)) return 'N/A';

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numAmount);

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
