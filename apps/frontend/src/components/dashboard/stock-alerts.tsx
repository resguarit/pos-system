import { Button } from "@/components/ui/button"
import { LoadingSkeleton, EmptyState } from "@/components/ui/loading-states"
import { StatusBadge, StatusDot } from "@/components/ui/action-components"
import { Package } from "lucide-react"
import { Link } from "react-router-dom"
import { useBranch } from "@/context/BranchContext"

interface StockAlert {
  product_id: number
  product_name: string
  branch_id: number
  branch_name: string
  current_quantity: number
  min_stock: number
  status: 'out_of_stock' | 'low_stock'
}

interface StockAlertsProps {
  alerts?: StockAlert[]
  isLoading?: boolean
  // Sucursal seleccionada para armar el filtro de inventario
  branchId?: number | string
}

export function StockAlerts({ alerts = [], isLoading = false, branchId }: StockAlertsProps) {
  const { selectedBranchIds } = useBranch()

  if (isLoading) {
    return (
      <LoadingSkeleton 
        className="space-y-4"
        items={4}
        height="auto"
      />
    )
  }

  if (alerts.length === 0) {
    return (
      <EmptyState 
        icon={<Package className="h-6 w-6 text-green-600" />}
        title="No hay alertas de stock"
        description="Todos los productos tienen stock suficiente"
        height="py-6"
      />
    )
  }

  const params = new URLSearchParams()
  const ids = (selectedBranchIds && selectedBranchIds.length > 0)
    ? selectedBranchIds
    : (branchId ? [String(branchId)] : [])
  ids.forEach((id) => params.append('branch', String(id)))
  params.set('stock', 'alerts')
  const inventoryUrl = `/dashboard/inventario?${params.toString()}`

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert) => {
        return (
          <div className="flex items-center justify-between py-2" key={`${alert.product_id}-${alert.branch_id}`}> 
            <div className="flex items-center flex-1 min-w-0">
              <StatusDot status={alert.status} />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-sm truncate block">{alert.product_name}</span>
                {alerts.length > 1 && (
                  <span className="text-xs text-gray-500">{alert.branch_name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {alert.current_quantity}/{alert.min_stock}
              </span>
              <StatusBadge 
                status={alert.status}
                customText={alert.status === 'out_of_stock' ? 'Agotado' : 'Stock bajo'}
              />
            </div>
          </div>
        )
      })}
      {alerts.length > 5 && (
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={inventoryUrl}>Ver inventario ({alerts.length})</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
