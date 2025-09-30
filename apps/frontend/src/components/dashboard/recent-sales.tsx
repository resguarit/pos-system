import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SimpleList } from "@/components/ui/data-display"
import { Eye } from "lucide-react"

interface Sale {
  id: number
  date: string
  total: number
  customer?: {
    id: number
    person?: {
      first_name: string
      last_name: string
    }
  }
  receiptType?: {
    id: number
    name: string
  }
  receipt_type?: {
    id: number
    name: string
  }
  customer_name?: string
}

interface RecentSalesProps {
  sales: Sale[]
  isLoading?: boolean
  onViewSale?: (sale: Sale) => void
  getCustomerName: (sale: Sale) => string
}

export function RecentSales({ 
  sales = [], 
  isLoading = false,
  onViewSale,
  getCustomerName
}: RecentSalesProps) {
  const renderSaleItem = (sale: Sale) => {
    // Construir el nombre del cliente
    const customerName = getCustomerName(sale)

    // Generar iniciales
    const initials = customerName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CF"

    // Formatear fecha
    const saleDate = new Date(sale.date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Obtener el nombre del tipo de comprobante
    const receiptTypeName = sale.receiptType?.name || sale.receipt_type?.name || 'Venta'

    return (
      // Hacemos el item alto y centrado para ocupar la fila completa
      <div className="flex items-center h-full py-1" key={sale.id}>
        <Avatar className="h-10 w-10">
          <AvatarImage src="/placeholder-user.jpg" alt="Avatar" />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1 flex-1">
          <p className="text-[15px] font-medium leading-none text-gray-900">
            {customerName}
          </p>
          <p className="text-xs text-gray-500">
            {receiptTypeName} • {saleDate}
          </p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <div className="font-semibold text-gray-900 text-right">
            {typeof sale.total === 'number' 
              ? sale.total.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })
              : '$0.00'
            }
          </div>
          {onViewSale && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewSale(sale)}
              title="Ver venta"
              className="h-8 w-8 p-0 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <SimpleList
      data={sales}
      isLoading={isLoading}
      emptyStateMessage="No hay ventas recientes"
      emptyStateIcon={
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      }
      renderItem={renderSaleItem}
      // Forzamos a que 5 items ocupen exactamente toda la altura de la tarjeta
      fillToCount={5}
      // Un poco de padding y separación visual entre filas
      itemClassName="px-1"
    />
  )
}

