import type React from "react"
import {
  FileText,
  MinusCircle,
  PlusCircle,
  ArrowDown,
  ArrowUp,
} from "lucide-react"

// Define una interfaz para asegurar que la función siempre devuelva el mismo tipo de objeto
interface ReceiptStyle {
  icon: React.ElementType
  className: string
}

// Mapea los tipos de comprobante a sus estilos (color e icono)
const receiptStyles: Record<string, ReceiptStyle> = {
  // Comprobantes tipo A
  "FACTURAS A": { icon: FileText, className: "border-transparent bg-purple-50 text-purple-700 hover:bg-purple-50 hover:text-purple-700" },
  "NOTAS DE DEBITO A": { icon: PlusCircle, className: "border-transparent bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700" },
  "NOTAS DE CREDITO A": { icon: MinusCircle, className: "border-transparent bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700" },
  "RECIBOS A": { icon: ArrowDown, className: "border-transparent bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700" },
  "NOTAS DE VENTA AL CONTADO A": { icon: FileText, className: "border-transparent bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700" },

  // Comprobantes tipo B
  "FACTURAS B": { icon: FileText, className: "border-transparent bg-cyan-50 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700" },
  "NOTAS DE DEBITO B": { icon: PlusCircle, className: "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800" },
  "NOTAS DE CREDITO B": { icon: MinusCircle, className: "border-transparent bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800" },
  "RECIBOS B": { icon: ArrowDown, className: "border-transparent bg-lime-50 text-lime-700 hover:bg-lime-50 hover:text-lime-700" },
  "NOTAS DE VENTA AL CONTADO B": { icon: FileText, className: "border-transparent bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-700" },

  // Comprobantes tipo C
  "FACTURAS C": { icon: FileText, className: "border-transparent bg-teal-50 text-teal-700 hover:bg-teal-50 hover:text-teal-700" },
  "NOTAS DE DEBITO C": { icon: PlusCircle, className: "border-transparent bg-orange-200 text-orange-900 hover:bg-orange-200 hover:text-orange-900" },
  "NOTAS DE CREDITO C": { icon: MinusCircle, className: "border-transparent bg-red-200 text-red-900 hover:bg-red-200 hover:text-red-900" },
  "RECIBOS C": { icon: ArrowDown, className: "border-transparent bg-pink-50 text-pink-700 hover:bg-pink-50 hover:text-pink-700" },

  // Otros tipos de comprobantes
  "PRESUPUESTO": { icon: FileText, className: "border-transparent bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700" },
  "FACTURA X": { icon: FileText, className: "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700" },
  "REMITO X": { icon: ArrowUp, className: "border-transparent bg-cyan-100 text-cyan-800 hover:bg-cyan-100" },

  // Estilo por defecto para cualquier otro caso
  "DEFAULT": { icon: FileText, className: "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100" },
};





/**
 * Devuelve el icono y la clase de CSS para un tipo de comprobante específico.
 * @param receiptName - El nombre del tipo de comprobante (ej. "FACTURAS A").
 * @returns Un objeto con el componente de icono y la clase de CSS.
 */
export const getReceiptStyle = (receiptName?: string): ReceiptStyle => {
  const upperCaseName = receiptName?.toUpperCase() || '';
  return receiptStyles[upperCaseName] || receiptStyles["DEFAULT"];
};
