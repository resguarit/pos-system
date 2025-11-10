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
  // Prioridad 1: Usar payment_method.name si está disponible (más confiable)
  if (movement.payment_method?.name) {
    const methodName = movement.payment_method.name
    if (isCashPaymentMethod && isCashPaymentMethod(methodName)) {
      return 'Efectivo'
    }
    return methodName
  }
  
  // Prioridad 2: Si hay payment_method_id pero no name, intentar inferir desde la descripción
  // o usar un valor por defecto basado en el tipo de movimiento
  if (movement.payment_method_id) {
    // Si hay ID pero no name, puede que la relación no esté cargada
    // Intentar inferir desde la descripción
    const description = (movement.description || '').toLowerCase()
    
    const paymentMethodKeywords = {
      'Efectivo': ['efectivo', 'cash', 'contado'],
      'Tarjeta Débito': ['tarjeta de débito', 'débito', 'debito'],
      'Tarjeta Crédito': ['tarjeta de crédito', 'crédito', 'credito'],
      'Transferencia': ['transferencia', 'transfer', 'banco'],
      'Mercado Pago': ['mercado pago', 'mp', 'mercadopago'],
      'Tarjeta': ['tarjeta', 'card']
    }
    
    for (const [methodName, keywords] of Object.entries(paymentMethodKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return methodName
      }
    }
  }
  
  // Prioridad 3: Buscar en la descripción del movimiento
  const description = (movement.description || '').toLowerCase()
  
  const paymentMethodKeywords = {
    'Efectivo': ['efectivo', 'cash', 'contado'],
    'Tarjeta Débito': ['tarjeta de débito', 'débito', 'debito'],
    'Tarjeta Crédito': ['tarjeta de crédito', 'crédito', 'credito'],
    'Transferencia': ['transferencia', 'transfer', 'banco'],
    'Mercado Pago': ['mercado pago', 'mp', 'mercadopago'],
    'Tarjeta': ['tarjeta', 'card']
  }
  
  for (const [methodName, keywords] of Object.entries(paymentMethodKeywords)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return methodName
    }
  }
  
  // Prioridad 4: Inferir desde el tipo de movimiento
  if (movement.movement_type?.id === 1) {
    return 'No especificado'
  }
  
  if (movement.movement_type?.is_cash_movement === true) {
    return 'Efectivo'
  }
  
  const typeDescription = (movement.movement_type?.description || '').toLowerCase()
  if (typeDescription.includes('gasto') || 
      typeDescription.includes('depósito') || 
      typeDescription.includes('retiro')) {
    return 'Efectivo'
  }
  
  // Por defecto, si no se puede determinar, usar "No especificado"
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
  
  // Primero, identificar todos los métodos de pago únicos para asegurar que todos aparezcan
  const uniquePaymentMethods = new Set<string>()
  
  // Procesar movimientos
  movements.forEach(movement => {
    // Solo procesar movimientos que afectan el balance
    if (movement.affects_balance === false) {
      return
    }
    
    // Excluir movimientos automáticos del sistema
    const movementTypeName = movement.movement_type?.name || ''
    if (['Apertura automática', 'Cierre automático', 'Ajuste del sistema'].includes(movementTypeName)) {
      return
    }
    
    // Obtener el método de pago
    const paymentMethod = getPaymentMethod(movement, isCashPaymentMethod)
    
    // Asegurar que el método de pago se agregue al conjunto de métodos únicos
    if (paymentMethod && paymentMethod !== 'No especificado') {
      uniquePaymentMethods.add(paymentMethod)
    }
    
    const amount = parseFloat(movement.amount) || 0
    
    // Determinar si es ingreso o egreso
    const opRaw = movement.movement_type?.operation_type || 
                  (movement.movement_type as any)?.operation_type
    const isIncome = typeof opRaw === 'string' 
      ? opRaw.toLowerCase() === 'entrada' 
      : !!(movement.movement_type as any)?.is_income
    
    // Inicializar el método de pago en el desglose si no existe
    if (!paymentBreakdown[paymentMethod]) {
      paymentBreakdown[paymentMethod] = 0
    }
    
    // Sumar o restar según sea ingreso o egreso
    paymentBreakdown[paymentMethod] += isIncome ? Math.abs(amount) : -Math.abs(amount)
  })
  
  // Asegurar que todos los métodos de pago únicos estén en el desglose (inicializados en 0 si no tienen movimientos)
  uniquePaymentMethods.forEach(method => {
    if (paymentBreakdown[method] === undefined) {
      paymentBreakdown[method] = 0
    }
  })
  
  // Agregar saldo inicial al efectivo
  if (paymentBreakdown['Efectivo'] !== undefined) {
    paymentBreakdown['Efectivo'] += openingBalance
  } else if (openingBalance > 0) {
    paymentBreakdown['Efectivo'] = openingBalance
  } else if (uniquePaymentMethods.has('Efectivo')) {
    // Si hay movimientos de efectivo pero el saldo es 0, asegurar que aparezca
    paymentBreakdown['Efectivo'] = openingBalance
  }
  
  return paymentBreakdown
}
