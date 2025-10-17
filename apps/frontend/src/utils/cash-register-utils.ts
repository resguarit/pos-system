import { format } from "date-fns"
import { es } from "date-fns/locale"

// Función para formatear moneda
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount)
}

// Función para formatear fechas
export const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return dateString
  }
}

// Función para obtener el nombre del cliente
export const getCustomerName = (sale: any) => {
  return sale.customer_name || 
    (sale.customer?.person 
      ? `${sale.customer.person.first_name} ${sale.customer.person.last_name}`.trim()
      : 'Consumidor Final')
}

// Función para obtener el tipo de comprobante
export const getReceiptType = (sale: any) => {
  return {
    displayName: sale.receiptType?.name || sale.receipt_type?.name || 'Venta',
    afipCode: sale.receiptType?.afip_code || sale.receipt_type?.afip_code || '0',
  }
}

// Función para determinar el método de pago de un movimiento
export const getPaymentMethod = (movement: any, isCashPaymentMethod?: (name: string) => boolean) => {
  if (movement.payment_method?.name) {
    if (isCashPaymentMethod && isCashPaymentMethod(movement.payment_method.name)) {
      return 'Efectivo'
    }
    return movement.payment_method.name
  }
  
  const description = movement.description.toLowerCase()
  
  const paymentMethodKeywords = {
    'Efectivo': ['efectivo'],
    'Tarjeta Débito': ['tarjeta de débito', 'débito'],
    'Tarjeta Crédito': ['tarjeta de crédito', 'crédito'],
    'Transferencia': ['transferencia'],
    'Mercado Pago': ['mercado pago', 'mp'],
    'Tarjeta': ['tarjeta']
  }
  
  for (const [methodName, keywords] of Object.entries(paymentMethodKeywords)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return methodName
    }
  }
  
  if (movement.movement_type?.id === 1) {
    return 'No especificado'
  }
  
  if (movement.movement_type?.is_cash_movement === true) {
    return 'Efectivo'
  }
  
  const typeDescription = movement.movement_type?.description.toLowerCase() || ''
  if (typeDescription.includes('gasto') || 
      typeDescription.includes('depósito') || 
      typeDescription.includes('retiro')) {
    return 'Efectivo'
  }
  
  return 'No especificado'
}

// Función para limpiar la descripción de un movimiento
export const cleanMovementDescription = (description: string) => {
  return typeof description === 'string'
    ? description.replace(/\s*-\s*Pago:\s*.*/i, '')
    : description
}

// Función para determinar si un movimiento es de ingreso
export const isIncomeMovement = (movement: any) => {
  const opRaw = (movement.movement_type as any)?.operation_type
  return typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
}

// Función para extraer ID de venta de la descripción
export const extractSaleIdFromDescription = (description: string) => {
  const match = description.match(/#(\d{8})/)
  return match ? match[1] : null
}

// Función para verificar si un movimiento está vinculado a una venta
export const isSaleReference = (movement: any) => {
  return (movement as any)?.reference_type === 'sale' && 
    ((movement as any)?.reference_id || (movement as any)?.metadata?.sale_id) ||
    movement.description.includes('Venta #')
}

// Función para verificar si un movimiento está vinculado a una orden de compra
export const isPurchaseOrderReference = (movement: any) => {
  return (movement as any)?.reference_type === 'purchase_order' && (movement as any)?.reference_id
}

// Función para calcular desglose de métodos de pago
export const calculatePaymentMethodBreakdown = (
  movements: any[], 
  openingBalance: number, 
  isCashPaymentMethod?: (name: string) => boolean
) => {
  let paymentBreakdown: Record<string, number> = {}
  
  // Procesar movimientos
  movements.forEach(movement => {
    const paymentMethod = getPaymentMethod(movement, isCashPaymentMethod)
    const amount = parseFloat(movement.amount) || 0
    const opRaw = (movement.movement_type as any)?.operation_type
    const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
    
    if (!paymentBreakdown[paymentMethod]) {
      paymentBreakdown[paymentMethod] = 0
    }
    
    paymentBreakdown[paymentMethod] += isIncome ? Math.abs(amount) : -Math.abs(amount)
  })
  
  // Agregar saldo inicial al efectivo
  if (paymentBreakdown['Efectivo']) {
    paymentBreakdown['Efectivo'] += openingBalance
  } else if (openingBalance > 0) {
    paymentBreakdown['Efectivo'] = openingBalance
  }
  
  return paymentBreakdown
}
