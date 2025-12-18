import type { CartItem } from "@/types/combo"

/**
 * Redondea un número a 2 decimales
 */
export const roundToTwoDecimals = (n: number): number => {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/**
 * Formatea un monto como moneda
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'ARS'): string => {
  const v = Number(amount || 0)
  const currencyFormatter = new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })

  if (currency === 'USD') {
    return `$ ${roundToTwoDecimals(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }
  return currencyFormatter.format(roundToTwoDecimals(v)) + ' ARS'
}

export interface SaleTotals {
  totalItemDiscount: number
  globalDiscountAmount: number
  subtotalNet: number
  totalIva: number
  total: number
}

export interface GlobalDiscount {
  type: 'percent' | 'amount' | ''
  value: string
}

/**
 * Calcula los totales de una venta aplicando descuentos por ítem y global
 */
export const calculateSaleTotals = (
  cart: CartItem[],
  globalDiscount: GlobalDiscount = { type: '', value: '' }
): SaleTotals => {
  // 1. Aplicar descuentos por ítem
  const prepared = cart.map((item) => {
    const unitWithIva = Number(item.price_with_iva || item.sale_price || 0)
    const qty = Math.max(1, Number(item.quantity || 0))
    const ivaRate = (item.iva_rate || 0) / 100

    const unitWithoutIva = ivaRate > 0 ? unitWithIva / (1 + ivaRate) : unitWithIva
    const baseWithoutIva = unitWithoutIva * qty

    let itemDiscountOnBase = 0
    const discountValue = Number(item.discount_value ?? 0)

    if (item.discount_type && discountValue > 0) {
      if (item.discount_type === 'percent') {
        itemDiscountOnBase = baseWithoutIva * (discountValue / 100)
      } else {
        itemDiscountOnBase = discountValue / (1 + ivaRate)
      }
    }
    
    itemDiscountOnBase = Math.max(0, Math.min(itemDiscountOnBase, baseWithoutIva))
    const netBase = baseWithoutIva - itemDiscountOnBase
    return { item, netBase }
  })

  const subtotalAfterItemDiscounts = prepared.reduce((sum, x) => sum + x.netBase, 0)

  // 2. Calcular IVA
  let totalIva = 0
  prepared.forEach((row) => {
    const ivaForItem = row.netBase * ((row.item.iva_rate || 0) / 100)
    totalIva += ivaForItem
  })
  totalIva = roundToTwoDecimals(totalIva)

  // 3. Aplicar descuento global
  const subtotalWithIva = roundToTwoDecimals(subtotalAfterItemDiscounts + totalIva)
  let globalDiscountAmount = 0
  const globalDiscountValue = Number(globalDiscount.value)

  if (globalDiscount.type && globalDiscountValue > 0) {
    if (globalDiscount.type === 'percent') {
      globalDiscountAmount = roundToTwoDecimals(subtotalWithIva * (globalDiscountValue / 100))
    } else {
      globalDiscountAmount = roundToTwoDecimals(globalDiscountValue)
    }
    globalDiscountAmount = Math.max(0, Math.min(globalDiscountAmount, subtotalWithIva))
  }

  // 4. Calcular total final
  const total = Math.max(0, roundToTwoDecimals(subtotalWithIva - globalDiscountAmount))
  
  const totalItemDiscount = prepared.reduce((sum, p, i) => {
    const originalBase = roundToTwoDecimals((cart[i].price || 0) * (cart[i].quantity || 0))
    return sum + Math.max(0, originalBase - p.netBase)
  }, 0)

  return {
    totalItemDiscount: roundToTwoDecimals(totalItemDiscount),
    globalDiscountAmount,
    subtotalNet: roundToTwoDecimals(subtotalAfterItemDiscounts),
    totalIva,
    total,
  }
}

/**
 * Extrae el product_id de un item del carrito
 */
export const extractProductId = (item: CartItem): number => {
  if (item.product_id && !isNaN(item.product_id)) {
    return item.product_id
  }
  
  if (item.id.startsWith('combo-')) {
    const parts = item.id.split('-')
    if (parts.length >= 3) {
      return parseInt(parts[2])
    }
    return parseInt(parts[parts.length - 1])
  }
  
  const parsedId = parseInt(item.id)
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error(`Invalid product_id for item ${item.id}`)
  }
  
  return parsedId
}

/**
 * Calcula el estado del pago basado en el total y el monto pagado
 * @param total Monto total de la venta
 * @param paid Monto pagado
 * @returns { status: 'pending' | 'exact' | 'change', amount: number }
 */
export const calculatePaymentStatus = (total: number, paid: number) => {
  const roundedTotal = roundToTwoDecimals(total)
  const roundedPaid = roundToTwoDecimals(paid)
  const diff = roundToTwoDecimals(roundedTotal - roundedPaid)

  if (diff > 0) {
    return { status: 'pending' as const, amount: diff }
  } else if (diff < 0) {
    return { status: 'change' as const, amount: roundToTwoDecimals(Math.abs(diff)) }
  } else {
    return { status: 'exact' as const, amount: 0 }
  }
}

/**
 * Valida si el pago es suficiente
 * @param total Monto total
 * @param paid Monto pagado
 * @returns true si el pago es exacto o hay cambio
 */
export const isPaymentSufficient = (total: number, paid: number): boolean => {
  const status = calculatePaymentStatus(total, paid)
  return status.status !== 'pending'
}
