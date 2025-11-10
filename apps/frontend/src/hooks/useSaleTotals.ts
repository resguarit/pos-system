import { useMemo } from 'react'
import { calculateSaleTotals, type GlobalDiscount, type SaleTotals } from '@/utils/sale-calculations'
import type { CartItem } from '@/types/combo'

/**
 * Hook personalizado para calcular los totales de una venta
 * Memoiza los cálculos para evitar recálculos innecesarios
 */
export const useSaleTotals = (
  cart: CartItem[],
  globalDiscount: GlobalDiscount = { type: '', value: '' }
): SaleTotals => {
  return useMemo(() => {
    return calculateSaleTotals(cart, globalDiscount)
  }, [cart, globalDiscount.type, globalDiscount.value])
}

