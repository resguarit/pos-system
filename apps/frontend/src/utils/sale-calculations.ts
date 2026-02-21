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
  discountableSubtotalWithIva: number
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
    const itemAllowsDiscount = item.allow_discount !== false

    let itemDiscountOnBase = 0
    const discountValue = Number(item.discount_value ?? 0)

    if (itemAllowsDiscount && item.discount_type && discountValue > 0) {
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
  const discountableSubtotalWithIva = roundToTwoDecimals(
    prepared
      .filter((x) => x.item.allow_discount !== false)
      .reduce((sum, x) => sum + x.netBase + (x.netBase * ((x.item.iva_rate || 0) / 100)), 0)
  )
  let globalDiscountAmount = 0
  const globalDiscountValue = Number(globalDiscount.value)

  if (globalDiscount.type && globalDiscountValue > 0) {
    if (globalDiscount.type === 'percent') {
      globalDiscountAmount = roundToTwoDecimals(discountableSubtotalWithIva * (globalDiscountValue / 100))
    } else {
      globalDiscountAmount = roundToTwoDecimals(globalDiscountValue)
    }
    globalDiscountAmount = Math.max(0, Math.min(globalDiscountAmount, discountableSubtotalWithIva))
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
    discountableSubtotalWithIva,
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

/**
 * Interface simplificada para el cálculo de descuentos
 */
export interface DiscountablePayment {
  payment_method_id: string | number
  amount: string
}

export interface DiscountableMethod {
  id: string | number
  discount_percentage?: number
}

export interface SalePaymentInput {
  payment_method_id: string
  amount: string
}

export interface PaymentMethodLike {
  id: string | number
  name?: string | null
}

export interface NormalizedSalePayment {
  payment_method_id: number
  amount: number
}

/**
 * Calcula el descuento total por métodos de pago
 * Reglas:
 * 1. Sumar descuentos de montos explícitos
 * 2. Si queda saldo pdte y hay métodos "abiertos" (sin monto), aplicar el mejor descuento al remanente
 */
export const calculatePaymentDiscount = (
  total: number,
  payments: DiscountablePayment[],
  methods: DiscountableMethod[]
): number => {
  const selectedPayments = payments.filter((payment) => Boolean(payment.payment_method_id))

  // Caso UX principal: una sola fila de pago con método con descuento.
  // El descuento debe mantenerse sobre el total de la venta mientras se escribe
  // el monto en esa misma fila, para evitar recálculo circular y "objetivo móvil".
  if (selectedPayments.length === 1) {
    const singlePayment = selectedPayments[0]
    const method = methods.find((candidate) => candidate.id.toString() === singlePayment.payment_method_id?.toString())
    const rate = method?.discount_percentage || 0

    if (rate > 0) {
      return roundToTwoDecimals(total * (rate / 100))
    }
  }

  let totalDiscount = 0
  let explicitPaid = 0

  // 1. Calcular descuentos de montos explícitos
  payments.forEach(p => {
    // Si no tiene monto, es un método "abierto", lo ignoramos en este paso
    const amountVal = parseFloat(p.amount || '0')
    if (amountVal <= 0) return

    const method = methods.find(m => m.id.toString() === p.payment_method_id?.toString())
    if (method && (method.discount_percentage || 0) > 0) {
      const discountableBase = Math.max(0, Math.min(amountVal, total - explicitPaid))
      const discountAmount = discountableBase * (method.discount_percentage! / 100)
      totalDiscount += discountAmount
    }
    explicitPaid += amountVal
  })

  // 2. Calcular remanente para métodos abiertos
  // El total sobre el que calculamos el remanente es el (Total Original - Descuentos ya aplicados por items/global)
  // Pero ojo: el descuento de pago reduce el total a pagar.
  // La lógica de "cuánto falta pagar" depende de: Total - (Pagado + Descuento).
  // Ecuación: Remanente = Total - ExplicitPaid. 
  // Ese Remanente se cubrirá con el método abierto. El descuento se aplica sobre ese remanente.

  const remainder = Math.max(0, total - explicitPaid)

  if (remainder > 0) {
    // Buscar si hay algún método "abierto" (sin monto definido o monto 0)
    // que tenga descuento. Usamos el mejor descuento disponible entre los métodos abiertos.
    const openMethodsWithDiscount = payments
      .filter(p => !parseFloat(p.amount || '0')) // Sin monto o 0
      .map(p => methods.find(m => m.id.toString() === p.payment_method_id?.toString()))
      .filter(m => m && (m.discount_percentage || 0) > 0)

    if (openMethodsWithDiscount.length > 0) {
      // Tomamos el mayor porcentaje de descuento de los métodos abiertos
      const maxRate = Math.max(...openMethodsWithDiscount.map(m => m!.discount_percentage!))
      const discountForRemainder = remainder * (maxRate / 100)
      totalDiscount += discountForRemainder
    }
  }

  return roundToTwoDecimals(totalDiscount)
}

/**
 * Normaliza pagos y, si hay sobrepago, descuenta primero de los métodos en efectivo.
 * Si no alcanza efectivo para absorber el cambio, usa fallback en la última fila.
 */
export const normalizePaymentsForFinalTotal = (
  finalTotal: number,
  payments: SalePaymentInput[],
  paymentMethods: PaymentMethodLike[]
): { payments: NormalizedSalePayment[]; diff: number } => {
  const normalizedPayments: NormalizedSalePayment[] = payments.map((payment) => ({
    payment_method_id: parseInt(payment.payment_method_id),
    amount: roundToTwoDecimals(parseFloat(payment.amount || '0') || 0),
  }))

  const paid = roundToTwoDecimals(normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0))
  const diff = roundToTwoDecimals(finalTotal - paid)

  if (diff >= 0) {
    return { payments: normalizedPayments, diff }
  }

  const isCashPaymentMethod = (paymentMethodId: string): boolean => {
    if (!paymentMethodId) return false
    const paymentMethod = paymentMethods.find((method) => method.id.toString() === paymentMethodId)
    const methodName = paymentMethod?.name?.toLowerCase() || ''
    return methodName.includes('efectivo') || methodName.includes('cash')
  }

  let remainingChange = roundToTwoDecimals(Math.abs(diff))

  const cashIndexes = payments
    .map((payment, idx) => (isCashPaymentMethod(payment.payment_method_id) ? idx : -1))
    .filter((idx) => idx >= 0)

  for (let i = cashIndexes.length - 1; i >= 0 && remainingChange > 0; i -= 1) {
    const paymentIndex = cashIndexes[i]
    const currentAmount = normalizedPayments[paymentIndex].amount
    const reducible = Math.min(currentAmount, remainingChange)

    normalizedPayments[paymentIndex].amount = roundToTwoDecimals(currentAmount - reducible)
    remainingChange = roundToTwoDecimals(remainingChange - reducible)
  }

  if (remainingChange > 0 && normalizedPayments.length > 0) {
    const fallbackIndex = normalizedPayments.length - 1
    normalizedPayments[fallbackIndex].amount = roundToTwoDecimals(
      Math.max(0, normalizedPayments[fallbackIndex].amount - remainingChange)
    )
  }

  return {
    payments: normalizedPayments,
    diff,
  }
}
