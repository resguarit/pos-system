// Utility functions for receipt type handling and colors
export const receiptTypeColors: Record<string, string> = {
  'FACTURAS A': 'bg-purple-50 text-purple-700 hover:bg-purple-50 hover:text-purple-700',
  'NOTAS DE DEBITO A': 'bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700',
  'NOTAS DE CREDITO A': 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700',
  'RECIBOS A': 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700',
  'NOTAS DE VENTA AL CONTADO A': 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700',
  'FACTURAS B': 'bg-cyan-50 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700',
  'NOTAS DE DEBITO B': 'bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800',
  'NOTAS DE CREDITO B': 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800',
  'RECIBOS B': 'bg-lime-50 text-lime-700 hover:bg-lime-50 hover:text-lime-700',
  'NOTAS DE VENTA AL CONTADO B': 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-700',
  'FACTURAS C': 'bg-teal-50 text-teal-700 hover:bg-teal-50 hover:text-teal-700',
  'NOTAS DE DEBITO C': 'bg-orange-200 text-orange-900 hover:bg-orange-200 hover:text-orange-900',
  'NOTAS DE CREDITO C': 'bg-red-200 text-red-900 hover:bg-red-200 hover:text-red-900',
  'RECIBOS C': 'bg-pink-50 text-pink-700 hover:bg-pink-50 hover:text-pink-700',
  'PRESUPUESTO': 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700',
  'FACTURA X': 'bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700',
  'FACTURA A': 'bg-purple-50 text-purple-700 hover:bg-purple-50 hover:text-purple-700',
  'FACTURA B': 'bg-cyan-50 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700',
  'FACTURA C': 'bg-teal-50 text-teal-700 hover:bg-teal-50 hover:text-teal-700',
  'NOTA DE CREDITO': 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700',
  'NOTA DE DEBITO': 'bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700',
  'RECIBO': 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700',
};

export interface ReceiptTypeInfo {
  displayName: string;
  filterKey: string;
  afipCode: string;
}

export interface SaleWithReceiptType {
  receipt_type?: string | {
    id: number
    description: string
    afip_code: string
    affects_stock_by_default?: boolean
  };
  receipt_type_id?: number;
  // Allow for string receipt_type field (from API response)
  [key: string]: any;
}

export const getReceiptType = (sale: SaleWithReceiptType): ReceiptTypeInfo => {
  // Check if receipt_type is an object with description
  if (sale.receipt_type && typeof sale.receipt_type === 'object' && sale.receipt_type.description) {
    const upperDescription = sale.receipt_type.description.toUpperCase();
    const afipCode = sale.receipt_type.afip_code || "N/A";
    return {
      displayName: upperDescription,
      filterKey: upperDescription,
      afipCode: afipCode,
    };
  }
  
  // Check for string receipt_type field (from API response)
  const actualReceiptType = (sale as any).receipt_type as string;
  const actualAfipCode = (sale as any).receipt_type_code as string;
  
  if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
    const upperDescription = actualReceiptType.toUpperCase();
    const afipCode = actualAfipCode || "N/A";
    return {
      displayName: upperDescription,
      filterKey: upperDescription,
      afipCode: afipCode,
    };
  }
  
  // Fallback
  return { displayName: "N/A", filterKey: "N/A", afipCode: "N/A" };
};

export const getReceiptTypeBadgeClasses = (receiptInfo: ReceiptTypeInfo): string => {
  return receiptTypeColors[receiptInfo.filterKey] || 'bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700';
};

export const getReceiptTypeBadgeText = (receiptInfo: ReceiptTypeInfo): string => {
  return receiptInfo.displayName !== "N/A" ? receiptInfo.displayName : receiptInfo.afipCode;
};
