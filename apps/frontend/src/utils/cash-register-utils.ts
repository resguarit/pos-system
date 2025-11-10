import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { CashMovement, MovementType, PaymentMethodBreakdown } from "@/types/cash-register.types"
import { SYSTEM_MOVEMENT_TYPES, PAYMENT_METHOD_KEYWORDS } from "@/types/cash-register.types"

// ============================================================================
// Constants
// ============================================================================

const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
} as const

const DATE_FORMAT_PATTERN = 'dd/MM/yyyy HH:mm' as const

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Formats a number as currency in Argentine Peso format
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', CURRENCY_FORMAT_OPTIONS).format(amount)
}

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string or original string if invalid
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    return format(date, DATE_FORMAT_PATTERN, { locale: es })
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

// ============================================================================
// Payment Method Detection
// ============================================================================

/**
 * Finds payment method from description using keyword matching
 * @param description - Movement description to search
 * @returns Payment method name or null if not found
 */
const findPaymentMethodFromDescription = (description: string): string | null => {
  const lowerDescription = description.toLowerCase()
  
  for (const [methodName, keywords] of Object.entries(PAYMENT_METHOD_KEYWORDS)) {
    if (keywords.some(keyword => lowerDescription.includes(keyword))) {
      return methodName
    }
  }
  
  return null
}

/**
 * Determines payment method from movement type
 * @param movementType - Movement type object
 * @returns Payment method name or null
 */
const inferPaymentMethodFromType = (movementType?: MovementType): string | null => {
  if (!movementType) return null
  
  if (movementType.id === 1) {
    return 'No especificado'
  }
  
  if (movementType.is_cash_movement === true) {
    return 'Efectivo'
  }
  
  const typeDescription = (movementType.description || '').toLowerCase()
  const cashKeywords = ['gasto', 'depósito', 'retiro']
  
  if (cashKeywords.some(keyword => typeDescription.includes(keyword))) {
    return 'Efectivo'
  }
  
  return null
}

/**
 * Determines the payment method for a cash movement
 * Uses a priority-based approach for maximum reliability
 * 
 * Priority order:
 * 1. payment_method.name (most reliable)
 * 2. Infer from description when payment_method_id exists
 * 3. Search in description
 * 4. Infer from movement type
 * 
 * @param movement - Cash movement object
 * @param isCashPaymentMethod - Optional function to check if a method is cash
 * @returns Payment method name
 */
export const getPaymentMethod = (
  movement: CashMovement,
  isCashPaymentMethod?: (name: string) => boolean
): string => {
  // Priority 1: Use payment_method.name if available (most reliable)
  if (movement.payment_method?.name) {
    const methodName = movement.payment_method.name
    if (isCashPaymentMethod && isCashPaymentMethod(methodName)) {
      return 'Efectivo'
    }
    return methodName
  }
  
  // Priority 2: If payment_method_id exists but name is missing, infer from description
  if (movement.payment_method_id && movement.description) {
    const inferred = findPaymentMethodFromDescription(movement.description)
    if (inferred) return inferred
  }
  
  // Priority 3: Search in description
  if (movement.description) {
    const inferred = findPaymentMethodFromDescription(movement.description)
    if (inferred) return inferred
  }
  
  // Priority 4: Infer from movement type
  const typeInferred = inferPaymentMethodFromType(movement.movement_type)
  if (typeInferred) return typeInferred
  
  // Default: Return "No especificado" if nothing matches
  return 'No especificado'
}

// ============================================================================
// Movement Utilities
// ============================================================================

/**
 * Cleans movement description by removing payment method suffix
 * @param description - Movement description
 * @returns Cleaned description
 */
export const cleanMovementDescription = (description: string): string => {
  if (typeof description !== 'string') {
    return description
  }
  return description.replace(/\s*-\s*Pago:\s*.*/i, '')
}

/**
 * Determines if a movement is an income (entrada)
 * @param movement - Cash movement object
 * @returns True if movement is income
 */
export const isIncomeMovement = (movement: CashMovement): boolean => {
  const movementType = movement.movement_type
  if (!movementType) return false
  
  const operationType = movementType.operation_type
  if (typeof operationType === 'string') {
    return operationType.toLowerCase() === 'entrada'
  }
  
  return movementType.is_income === true
}

/**
 * Extracts sale ID from movement description
 * @param description - Movement description
 * @returns Sale ID string or null
 */
export const extractSaleIdFromDescription = (description: string): string | null => {
  const match = description.match(/#(\d{8})/)
  return match ? match[1] : null
}

/**
 * Checks if a movement is linked to a sale
 * @param movement - Cash movement object
 * @returns True if movement is linked to a sale
 */
export const isSaleReference = (movement: CashMovement): boolean => {
  return (
    movement.reference_type === 'sale' && 
    (movement.reference_id !== undefined || (movement as any)?.metadata?.sale_id)
  ) || movement.description.includes('Venta #')
}

/**
 * Checks if a movement is linked to a purchase order
 * @param movement - Cash movement object
 * @returns True if movement is linked to a purchase order
 */
export const isPurchaseOrderReference = (movement: CashMovement): boolean => {
  return movement.reference_type === 'purchase_order' && movement.reference_id !== undefined
}

// ============================================================================
// Payment Method Breakdown Calculation
// ============================================================================

/**
 * Checks if a movement should be excluded from breakdown calculation
 * @param movement - Cash movement object
 * @returns True if movement should be excluded
 */
const shouldExcludeMovement = (movement: CashMovement): boolean => {
  // Exclude movements that don't affect balance
  if (movement.affects_balance === false) {
    return true
  }
  
  // Exclude automatic system movements
  const movementTypeName = movement.movement_type?.name || ''
  return SYSTEM_MOVEMENT_TYPES.includes(movementTypeName as any)
}

/**
 * Calculates payment method breakdown from movements
 * 
 * @param movements - Array of cash movements
 * @param openingBalance - Initial cash balance
 * @param isCashPaymentMethod - Optional function to check if a method is cash
 * @returns Payment method breakdown object
 */
export const calculatePaymentMethodBreakdown = (
  movements: CashMovement[],
  openingBalance: number,
  isCashPaymentMethod?: (name: string) => boolean
): PaymentMethodBreakdown => {
  const paymentBreakdown: PaymentMethodBreakdown = {}
  const uniquePaymentMethods = new Set<string>()
  
  // Process movements
  for (const movement of movements) {
    // Skip excluded movements
    if (shouldExcludeMovement(movement)) {
      continue
    }
    
    // Get payment method
    const paymentMethod = getPaymentMethod(movement, isCashPaymentMethod)
    
    // Track unique payment methods
    if (paymentMethod && paymentMethod !== 'No especificado') {
      uniquePaymentMethods.add(paymentMethod)
    }
    
    // Initialize payment method in breakdown if not exists
    if (!paymentBreakdown[paymentMethod]) {
      paymentBreakdown[paymentMethod] = 0
    }
    
    // Calculate amount
    const amount = typeof movement.amount === 'string' 
      ? parseFloat(movement.amount) || 0 
      : movement.amount || 0
    
    // Determine if income or expense
    const isIncome = isIncomeMovement(movement)
    
    // Add or subtract based on income/expense
    paymentBreakdown[paymentMethod] += isIncome ? Math.abs(amount) : -Math.abs(amount)
  }
  
  // Ensure all unique payment methods are in breakdown (initialized to 0 if no movements)
  for (const method of uniquePaymentMethods) {
    if (paymentBreakdown[method] === undefined) {
      paymentBreakdown[method] = 0
    }
  }
  
  // Add opening balance to cash
  if (paymentBreakdown['Efectivo'] !== undefined) {
    paymentBreakdown['Efectivo'] += openingBalance
  } else if (openingBalance > 0) {
    paymentBreakdown['Efectivo'] = openingBalance
  } else if (uniquePaymentMethods.has('Efectivo')) {
    // If there are cash movements but balance is 0, ensure it appears
    paymentBreakdown['Efectivo'] = openingBalance
  }
  
  return paymentBreakdown
}
