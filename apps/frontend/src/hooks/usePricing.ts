import { useState, useEffect, useCallback } from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { NumberFormatter } from '@/lib/formatters/numberFormatter';

interface PricingCalculation {
  unitPrice: number;
  currency: string;
  markup: number;
  ivaRate: number;
  salePrice: number;
}

interface UsePricingProps {
  unitPrice?: number;
  currency?: string;
  markup?: number;
  ivaRate?: number;
  initialSalePrice?: number;
}

/**
 * Hook personalizado para cálculos de precios siguiendo la lógica del backend
 * Mantiene consistencia entre frontend y backend
 */
export function usePricing({
  unitPrice = 0,
  currency = 'ARS',
  markup = 0,
  ivaRate = 0,
  initialSalePrice = 0
}: UsePricingProps = {}) {
  const { rate: exchangeRate } = useExchangeRate({ fromCurrency: 'USD', toCurrency: 'ARS' });
  
  const [pricing, setPricing] = useState<PricingCalculation>({
    unitPrice,
    currency,
    markup,
    ivaRate,
    salePrice: initialSalePrice
  });

  /**
   * Convierte USD a ARS usando la tasa de cambio actual
   */
  const convertUsdToArs = useCallback((amount: number, targetCurrency: string = pricing.currency): number => {
    if (targetCurrency === 'USD') {
      if (exchangeRate && exchangeRate > 0) {
        return amount * exchangeRate;
      } else {
        // Si no hay tasa de cambio, mostrar error o usar valor por defecto
        console.error('No hay tasa de cambio disponible para convertir USD a ARS');
        return amount; // Retornar el valor sin convertir como fallback
      }
    }
    return amount;
  }, [pricing.currency, exchangeRate]);

  /**
   * Calcula el precio de venta basado en costo, markup e IVA
   * Fórmula: costo * (1 + iva) * (1 + markup)
   */
  const calculateSalePrice = useCallback((
    unitPrice: number,
    currency: string,
    markup: number,
    ivaRate: number = 0
  ): number => {
    // 1. Convertir costo a ARS si es necesario
    const costInArs = currency === 'USD' ? convertUsdToArs(unitPrice, currency) : unitPrice;
    
    // 2. Aplicar IVA primero
    const costWithIva = costInArs * (1 + ivaRate);
    
    // 3. Aplicar markup después
    const priceWithMarkup = costWithIva * (1 + markup);
    
    // 4. Redondear de manera inteligente
    const finalPrice = priceWithMarkup < 1000 
      ? Math.round(priceWithMarkup / 10) * 10  // Para precios pequeños, múltiplos de 10
      : Math.round(priceWithMarkup / 100) * 100; // Para precios grandes, múltiplos de 100
    
    return finalPrice;
  }, [convertUsdToArs]);

  /**
   * Calcula el markup basado en precio de venta y costo
   * Fórmula: (precio_sin_iva / costo) - 1
   */
  const calculateMarkup = useCallback((
    unitPrice: number,
    currency: string,
    salePrice: number,
    ivaRate: number = 0
  ): number => {
    // 1. Convertir costo a ARS
    const costInArs = currency === 'USD' ? convertUsdToArs(unitPrice, currency) : unitPrice;
    
    // 2. Remover IVA del precio de venta
    const priceWithoutIva = salePrice / (1 + ivaRate);
    
    // 3. Calcular markup
    const markup = (priceWithoutIva / costInArs) - 1;
    
    // 4. Redondear a 4 decimales
    return Math.round(markup * 10000) / 10000;
  }, [convertUsdToArs]);

  /**
   * Actualiza el precio unitario y recalcula el precio de venta manteniendo el markup
   */
  const updateUnitPrice = useCallback((newUnitPrice: number) => {
    const newSalePrice = calculateSalePrice(newUnitPrice, pricing.currency, pricing.markup, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      unitPrice: newUnitPrice,
      salePrice: newSalePrice
    }));
  }, [pricing.currency, pricing.markup, pricing.ivaRate, calculateSalePrice]);

  /**
   * Actualiza el markup y recalcula el precio de venta
   */
  const updateMarkup = useCallback((newMarkup: number) => {
    const newSalePrice = calculateSalePrice(pricing.unitPrice, pricing.currency, newMarkup, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      markup: newMarkup,
      salePrice: newSalePrice
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.ivaRate, calculateSalePrice]);

  /**
   * Actualiza el precio de venta y recalcula el markup
   */
  const updateSalePrice = useCallback((newSalePrice: number) => {
    const newMarkup = calculateMarkup(pricing.unitPrice, pricing.currency, newSalePrice, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      markup: newMarkup,
      salePrice: newSalePrice
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.ivaRate, calculateMarkup]);

  /**
   * Actualiza la moneda y recalcula el precio de venta
   */
  const updateCurrency = useCallback((newCurrency: string) => {
    const newSalePrice = calculateSalePrice(pricing.unitPrice, newCurrency, pricing.markup, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      currency: newCurrency,
      salePrice: newSalePrice
    }));
  }, [pricing.unitPrice, pricing.markup, pricing.ivaRate, calculateSalePrice]);

  /**
   * Actualiza la tasa de IVA y recalcula el precio de venta
   */
  const updateIvaRate = useCallback((newIvaRate: number) => {
    const newSalePrice = calculateSalePrice(pricing.unitPrice, pricing.currency, pricing.markup, newIvaRate);
    setPricing(prev => ({
      ...prev,
      ivaRate: newIvaRate,
      salePrice: newSalePrice
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.markup, calculateSalePrice]);

  /**
   * Valida que los parámetros de precio sean válidos
   */
  const validatePricing = useCallback((): boolean => {
    return pricing.unitPrice > 0 && pricing.markup >= -1 && pricing.salePrice > 0;
  }, [pricing.unitPrice, pricing.markup, pricing.salePrice]);

  /**
   * Formatea un precio para mostrar en la UI
   * DRY: Reutiliza la lógica de formateo centralizada
   */
  const formatPrice = useCallback((price: number, currency: string = 'ARS'): string => {
    return NumberFormatter.formatSalePrice(price, currency);
  }, []);

  /**
   * Formatea un precio unitario para mostrar en la UI
   * DRY: Reutiliza la lógica de formateo centralizada
   */
  const formatUnitPrice = useCallback((price: number, currency: string = 'ARS'): string => {
    return NumberFormatter.formatUnitPrice(price, currency);
  }, []);

  /**
   * Formatea un markup para mostrar en la UI
   * DRY: Reutiliza la lógica de formateo centralizada
   */
  const formatMarkup = useCallback((markup: number): string => {
    return NumberFormatter.formatPercentage(markup, 2);
  }, []);

  // Actualizar pricing cuando cambien los props externos o el tipo de cambio
  useEffect(() => {
    const calculatedPrice = calculateSalePrice(unitPrice, currency, markup, ivaRate);
    
    setPricing(prev => ({
      ...prev,
      unitPrice,
      currency,
      markup,
      ivaRate,
      salePrice: calculatedPrice // Siempre usar el precio calculado
    }));
  }, [unitPrice, currency, markup, ivaRate, initialSalePrice, calculateSalePrice, exchangeRate]);

  return {
    pricing,
    updateUnitPrice,
    updateMarkup,
    updateSalePrice,
    updateCurrency,
    updateIvaRate,
    validatePricing,
    formatPrice,
    formatUnitPrice,
    formatMarkup,
    calculateSalePrice,
    calculateMarkup
  };
}
