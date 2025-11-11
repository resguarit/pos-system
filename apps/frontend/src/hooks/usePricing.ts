import { useState, useEffect, useCallback } from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { NumberFormatter } from '@/lib/formatters/numberFormatter';

interface PricingCalculation {
  unitPrice: number;
  currency: string;
  markup: number;
  ivaRate: number;
  salePrice: number;
  hasChanged: boolean;
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
    salePrice: initialSalePrice,
    hasChanged: false
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
   * Asegura que el markup nunca sea negativo (mínimo 0%)
   */
  const calculateMarkup = useCallback((
    unitPrice: number,
    currency: string,
    salePrice: number,
    ivaRate: number = 0
  ): number => {
    // Validar entradas
    if (!unitPrice || unitPrice <= 0 || !salePrice || salePrice <= 0) {
      return 0;
    }
    
    // 1. Convertir costo a ARS
    const costInArs = currency === 'USD' ? convertUsdToArs(unitPrice, currency) : unitPrice;
    
    // Validar que el costo sea válido
    if (!costInArs || costInArs <= 0 || !isFinite(costInArs)) {
      return 0;
    }
    
    console.log('calculateMarkup DEBUG:');
    console.log('  - unitPrice:', unitPrice);
    console.log('  - currency:', currency);
    console.log('  - salePrice:', salePrice);
    console.log('  - ivaRate:', ivaRate);
    console.log('  - costInArs:', costInArs);
    
    // 2. Remover IVA del precio de venta
    const priceWithoutIva = salePrice / (1 + ivaRate);
    console.log('  - priceWithoutIva:', priceWithoutIva);
    
    // Validar que el precio sin IVA sea válido
    if (!priceWithoutIva || priceWithoutIva <= 0 || !isFinite(priceWithoutIva)) {
      return 0;
    }
    
    // 3. Calcular markup
    const markup = (priceWithoutIva / costInArs) - 1;
    console.log('  - markup calculado:', markup);
    
    // 4. Asegurar que el markup nunca sea negativo (mínimo 0%)
    const safeMarkup = markup < 0 ? 0 : markup;
    
    // 5. Redondear a 4 decimales
    const finalMarkup = Math.round(safeMarkup * 10000) / 10000;
    console.log('  - markup final:', finalMarkup);
    
    return finalMarkup;
  }, [convertUsdToArs]);

  /**
   * Actualiza el precio unitario manteniendo el markup y recalculando solo el precio de venta
   */
  const updateUnitPrice = useCallback((newUnitPrice: number) => {
    const newSalePrice = calculateSalePrice(newUnitPrice, pricing.currency, pricing.markup, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      unitPrice: newUnitPrice,
      salePrice: newSalePrice,
      // markup se mantiene igual (no se recalcula)
      hasChanged: true
    }));
  }, [pricing.currency, pricing.markup, pricing.ivaRate, calculateSalePrice]);

  /**
   * Actualiza el markup manteniendo el precio unitario y recalculando solo el precio de venta
   */
  const updateMarkup = useCallback((newMarkup: number) => {
    const newSalePrice = calculateSalePrice(pricing.unitPrice, pricing.currency, newMarkup, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      markup: newMarkup,
      salePrice: newSalePrice,
      // unitPrice se mantiene igual (no se recalcula)
      hasChanged: true
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.ivaRate, calculateSalePrice]);

  /**
   * Actualiza el precio de venta manteniendo el precio unitario y recalculando solo el markup
   */
  const updateSalePrice = useCallback((newSalePrice: number) => {
    const newMarkup = calculateMarkup(pricing.unitPrice, pricing.currency, newSalePrice, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      markup: newMarkup,
      salePrice: newSalePrice,
      // unitPrice se mantiene igual (no se recalcula)
      hasChanged: true
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.ivaRate, calculateMarkup]);

  /**
   * Actualiza la moneda y recalcula el precio de venta y markup
   */
  const updateCurrency = useCallback((newCurrency: string) => {
    const newSalePrice = calculateSalePrice(pricing.unitPrice, newCurrency, pricing.markup, pricing.ivaRate);
    const newMarkup = calculateMarkup(pricing.unitPrice, newCurrency, pricing.salePrice, pricing.ivaRate);
    setPricing(prev => ({
      ...prev,
      currency: newCurrency,
      salePrice: newSalePrice,
      markup: newMarkup,
      hasChanged: true
    }));
  }, [pricing.unitPrice, pricing.markup, pricing.ivaRate, pricing.salePrice, calculateSalePrice, calculateMarkup]);

  /**
   * Actualiza la tasa de IVA manteniendo el precio de venta y recalculando el markup
   */
  const updateIvaRate = useCallback((newIvaRate: number) => {
    // MANTENER el precio de venta actual y recalcular solo el markup
    const newMarkup = calculateMarkup(pricing.unitPrice, pricing.currency, pricing.salePrice, newIvaRate);
    setPricing(prev => ({
      ...prev,
      ivaRate: newIvaRate,
      markup: newMarkup,
      hasChanged: true
      // salePrice se mantiene igual (no se recalcula)
    }));
  }, [pricing.unitPrice, pricing.currency, pricing.salePrice, calculateMarkup]);

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
    // No sobrescribir si el usuario ya ha hecho cambios manuales
    if (pricing.hasChanged) return;
    
    // Si hay un precio inicial (precio manual guardado), respetarlo
    // Solo calcular automáticamente si initialSalePrice es 0 o no existe
    const finalSalePrice = initialSalePrice && initialSalePrice > 0 
      ? initialSalePrice 
      : calculateSalePrice(unitPrice, currency, markup, ivaRate);
    
    setPricing(prev => ({
      ...prev,
      unitPrice,
      currency,
      markup,
      ivaRate,
      salePrice: finalSalePrice,
      hasChanged: false
    }));
  }, [unitPrice, currency, markup, ivaRate, initialSalePrice, calculateSalePrice, exchangeRate, pricing.hasChanged]);

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
