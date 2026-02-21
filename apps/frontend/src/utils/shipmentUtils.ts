/**
 * Parsea el costo de envío correctamente desde cualquier formato
 * @param cost - El costo que puede venir como number, string, null o undefined
 * @returns El valor numérico del costo, o 0 si no es válido
 */
export function parseShippingCost(cost: number | string | null | undefined): number {
  if (cost === null || cost === undefined) return 0;

  // Si es número, usarlo directamente
  if (typeof cost === 'number') return cost;

  // Si es string, parsearlo como número decimal
  if (typeof cost === 'string') {
    // Remover espacios y caracteres no numéricos excepto punto, coma y signo menos
    const cleaned = cost.trim().replace(/[^\d.,-]/g, '');

    // Si está vacío después de limpiar, retornar 0
    if (!cleaned) return 0;

    // Si tiene coma como separador decimal (formato argentino: 2.000,00)
    if (cleaned.includes(',')) {
      // Remover separadores de miles (puntos) y convertir coma a punto
      const withoutThousands = cleaned.replace(/\./g, '');
      const withDot = withoutThousands.replace(',', '.');
      const parsed = parseFloat(withDot);
      return isNaN(parsed) ? 0 : parsed;
    }

    // Si tiene punto como separador decimal (formato inglés: 2000.00)
    // o es un número simple sin separadores
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}


import { Shipment, ShipmentStage, Sale } from '@/types/shipment';

/**
 * Información de cobro por método de pago
 */
export interface PaymentMethodInstruction {
  method: string;
  amountToCollect: number;
  amountCollected: number;
  isFullyCollected: boolean;
  sales: Array<{
    saleId: number;
    receiptNumber: string;
    amount: number;
  }>;
}

/**
 * Información de pago por venta
 */
export interface SalePaymentInfo {
  saleId: number;
  receiptNumber: string;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMethods: Array<{
    name: string;
    amount: number;
  }>;
}

type RawSalePayment = {
  id: number;
  amount: number | string;
  payment_method?: {
    id: number;
    name: string;
  };
};

const getSalePayments = (sale: Sale): RawSalePayment[] => {
  if (Array.isArray(sale.payments) && sale.payments.length > 0) {
    return sale.payments as RawSalePayment[];
  }

  if (Array.isArray(sale.sale_payments) && sale.sale_payments.length > 0) {
    return sale.sale_payments as RawSalePayment[];
  }

  return [];
};

/**
 * Resumen de pagos del envío
 */
export interface ShipmentPaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  hasPendingPayments: boolean;
  salesInfo: SalePaymentInfo[];
  instructionsByMethod: PaymentMethodInstruction[];
}

/**
 * Calcula el resumen completo de pagos de un envío
 */
export const getShipmentPaymentSummary = (shipment: Shipment): ShipmentPaymentSummary => {
  if (!shipment.sales || shipment.sales.length === 0) {
    return {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      hasPendingPayments: false,
      salesInfo: [],
      instructionsByMethod: [],
    };
  }

  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  const salesInfo: SalePaymentInfo[] = [];
  const methodsMap = new Map<string, PaymentMethodInstruction>();

  shipment.sales.forEach((sale: Sale) => {
    const saleTotal = Number(sale.total ?? 0);
    const salePaid = typeof sale.paid_amount === 'number' ? sale.paid_amount : parseFloat(sale.paid_amount?.toString() || '0');
    const salePending = Number(sale.pending_amount ?? 0);

    totalAmount += saleTotal;
    paidAmount += salePaid;
    pendingAmount += salePending;

    // Extraer métodos de pago
    const paymentMethods: Array<{ name: string; amount: number }> = [];
    const salePayments = getSalePayments(sale);
    if (salePayments.length > 0) {
      salePayments.forEach((payment: RawSalePayment) => {
        if (payment.payment_method?.name) {
          const methodName = payment.payment_method.name;
          const amount = typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount?.toString() || '0');
          
          paymentMethods.push({ name: methodName, amount });

          // Agrupar por método
          if (!methodsMap.has(methodName)) {
            methodsMap.set(methodName, {
              method: methodName,
              amountToCollect: 0,
              amountCollected: amount,
              isFullyCollected: false,
              sales: [],
            });
          } else {
            const existing = methodsMap.get(methodName)!;
            existing.amountCollected += amount;
          }

          // Agregar venta al método
          methodsMap.get(methodName)!.sales.push({
            saleId: sale.id,
            receiptNumber: sale.receipt_number,
            amount,
          });
        }
      });
    }

    salesInfo.push({
      saleId: sale.id,
      receiptNumber: sale.receipt_number,
      total: saleTotal,
      paidAmount: salePaid,
      pendingAmount: salePending,
      paymentMethods,
    });
  });

  // Determinar si cada método está totalmente cobrado
  methodsMap.forEach((instruction) => {
    instruction.isFullyCollected = instruction.amountToCollect === 0;
  });

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    hasPendingPayments: pendingAmount > 0,
    salesInfo,
    instructionsByMethod: Array.from(methodsMap.values())
      .sort((a, b) => b.amountCollected - a.amountCollected),
  };
};

/**
 * Obtiene los métodos de pago de las ventas asociadas a un envío
 */
export const getPaymentMethodsFromShipment = (shipment: Shipment): string[] => {
  if (!shipment.sales || shipment.sales.length === 0) return ['-'];

  const methods = new Set<string>();

  shipment.sales.forEach((sale: Sale) => {
    // Si la venta tiene pagos registrados explícitamente
    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((payment: any) => {
        if (payment.payment_method?.name) {
          methods.add(payment.payment_method.name);
        }
      });
    }
  });

  if (methods.size === 0) return ['-'];
  return Array.from(methods);
};

/**
 * Obtiene el color base para un estado
 */
export const getStageColor = (stage: ShipmentStage): string => {
  if (stage.color) return stage.color;

  // Default colors (Tailwind 600 for better text contrast)
  switch (stage.order) {
    case 1: return '#475569'; // slate-600
    case 2: return '#d97706'; // amber-600 (darker yellow)
    case 3: return '#2563eb'; // blue-600
    case 4: return '#16a34a'; // green-600
    case 5: return '#dc2626'; // red-600
    default: return '#475569'; // slate-600
  }
};

/**
 * Genera los estilos CSS para el badge de estado
 * @param stage Estado del envío
 * @returns Objeto de estilos CSS
 */
export const getStageBadgeStyle = (stage: ShipmentStage | undefined) => {
  if (!stage) {
    return {
      backgroundColor: '#f1f5f9', // slate-100
      color: '#475569', // slate-600
      borderColor: '#e2e8f0', // slate-200
    };
  }

  const color = getStageColor(stage);

  return {
    backgroundColor: `${color}25`, // ~15% opacity for background (visible but not overwhelming)
    color: color, // Solid color for text
    borderColor: `${color}80`, // ~50% opacity for border (defines shape well)
    fontWeight: 600, // Make text bolder for better readability
  };
};
