/**
 * Servicio centralizado para formateo de números y monedas
 * Sigue principios SOLID y DRY
 */

export interface NumberFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export interface CurrencyFormatOptions extends NumberFormatOptions {
  showCurrency?: boolean;
  currencyPosition?: 'before' | 'after';
}

/**
 * Clase para formateo de números siguiendo SRP (Single Responsibility Principle)
 * Cada método tiene una responsabilidad específica
 */
export class NumberFormatter {
  private static readonly DEFAULT_LOCALE = 'es-AR';
  private static readonly DEFAULT_CURRENCY = 'ARS';
  
  /**
   * Formatea un número con separadores de miles
   * SRP: Responsabilidad única de formatear números
   */
  static formatNumber(
    value: number | string, 
    options: NumberFormatOptions = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
      useGrouping = true
    } = options;

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return '0';
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    }).format(numericValue);
  }

  /**
   * Formatea un número como moneda
   * SRP: Responsabilidad única de formatear monedas
   */
  static formatCurrency(
    value: number | string,
    options: CurrencyFormatOptions = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      currency = this.DEFAULT_CURRENCY,
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
      useGrouping = true,
      showCurrency = true,
      currencyPosition = 'before'
    } = options;

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return showCurrency ? '$0,00' : '0,00';
    }

    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    }).format(numericValue);

    if (!showCurrency) {
      return formattedNumber;
    }

    const currencySymbol = currency === 'USD' ? 'US$' : '$';
    
    return currencyPosition === 'before' 
      ? `${currencySymbol} ${formattedNumber}`
      : `${formattedNumber} ${currencySymbol}`;
  }

  /**
   * Formatea un precio unitario (sin símbolo de moneda)
   * SRP: Responsabilidad específica para precios unitarios
   * Nota: currency no se usa porque el precio unitario no muestra símbolo de moneda
   */
  static formatUnitPrice(
    value: number | string,
    _currency: string = 'ARS' // eslint-disable-line @typescript-eslint/no-unused-vars
  ): string {
    return this.formatNumber(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  }

  /**
   * Formatea un precio de venta (con símbolo de moneda)
   * SRP: Responsabilidad específica para precios de venta
   */
  static formatSalePrice(
    value: number | string,
    currency: string = 'ARS'
  ): string {
    return this.formatCurrency(value, {
      currency,
      showCurrency: true,
      currencyPosition: 'before'
    });
  }

  /**
   * Formatea un porcentaje
   * SRP: Responsabilidad específica para porcentajes
   */
  static formatPercentage(
    value: number | string,
    decimals: number = 2
  ): string {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return '0%';
    }

    return `${this.formatNumber(numericValue * 100, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: false
    })}%`;
  }

  /**
   * Parsea un string formateado de vuelta a número
   * SRP: Responsabilidad específica para parsing
   */
  static parseFormattedNumber(formattedValue: string): number {
    // Remover separadores de miles y reemplazar coma decimal por punto
    const cleanValue = formattedValue
      .replace(/\./g, '') // Remover puntos (separadores de miles)
      .replace(',', '.'); // Reemplazar coma decimal por punto
    
    return parseFloat(cleanValue) || 0;
  }

  /**
   * Valida si un string es un número válido
   * SRP: Responsabilidad específica para validación
   */
  static isValidNumber(value: string): boolean {
    const parsed = this.parseFormattedNumber(value);
    return !isNaN(parsed) && isFinite(parsed);
  }
}

/**
 * Hook personalizado para formateo siguiendo DRY principle
 * Evita repetir la lógica de formateo en múltiples componentes
 */
export const useNumberFormatter = () => {
  return {
    formatNumber: NumberFormatter.formatNumber,
    formatCurrency: NumberFormatter.formatCurrency,
    formatUnitPrice: NumberFormatter.formatUnitPrice,
    formatSalePrice: NumberFormatter.formatSalePrice,
    formatPercentage: NumberFormatter.formatPercentage,
    parseFormattedNumber: NumberFormatter.parseFormattedNumber,
    isValidNumber: NumberFormatter.isValidNumber
  };
};

/**
 * Utilidades específicas para el dominio de precios
 * OCP: Abierto para extensión, cerrado para modificación
 */
export class PriceFormatter extends NumberFormatter {
  /**
   * Formatea precio unitario específico para el dominio
   */
  static formatUnitPriceForDomain(
    value: number | string,
    currency: string
  ): string {
    if (currency === 'USD') {
      return this.formatNumber(value, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
      });
    }
    
    return this.formatUnitPrice(value);
  }

  /**
   * Formatea precio de venta específico para el dominio
   */
  static formatSalePriceForDomain(
    value: number | string,
    currency: string
  ): string {
    if (currency === 'USD') {
      return this.formatCurrency(value, {
        currency: 'USD',
        showCurrency: true,
        currencyPosition: 'before'
      });
    }
    
    return this.formatSalePrice(value, currency);
  }
}
