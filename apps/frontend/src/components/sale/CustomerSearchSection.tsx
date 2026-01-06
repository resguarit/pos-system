import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from "lucide-react"
import type { CustomerOption } from '@/hooks/useCustomerSearch'

interface CustomerSearchSectionProps {
  customerSearch: string
  customerOptions: CustomerOption[]
  showCustomerOptions: boolean
  selectedCustomer: CustomerOption | null
  customerBalance?: number | null
  loadingBalance?: boolean
  onSearchChange: (value: string) => void
  onCustomerSelect: (customer: CustomerOption) => void
  onShowOptionsChange: (show: boolean) => void
  onNewCustomerClick: () => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function CustomerSearchSection({
  customerSearch,
  customerOptions,
  showCustomerOptions,
  selectedCustomer,
  customerBalance,
  loadingBalance = false,
  onSearchChange,
  onCustomerSelect,
  onShowOptionsChange,
  onNewCustomerClick,
}: CustomerSearchSectionProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1">
          <Label>Buscar cliente (DNI, nombre o teléfono)</Label>
          <div className="relative">
            <Input
              value={customerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => onShowOptionsChange(customerSearch.length >= 1)}
              onBlur={() => setTimeout(() => onShowOptionsChange(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onShowOptionsChange(false)
              }}
              placeholder="Ingrese nombre, DNI o teléfono..."
            />
            {customerOptions.length > 0 && showCustomerOptions && (
              <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                {customerOptions.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    role="button"
                    tabIndex={0}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onCustomerSelect(c)
                      const el = document.activeElement as HTMLElement | null
                      if (el && typeof el.blur === 'function') el.blur()
                    }}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button className="mt-6 whitespace-nowrap" variant="outline" onClick={onNewCustomerClick}>
          +
        </Button>
      </div>

      {selectedCustomer && (
        <div className="mt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">Información del Cliente</h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Columna izquierda - Datos del cliente */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Nombre:</span>
                  <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                </div>
                {selectedCustomer.cuit && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">CUIT:</span>
                    <span className="font-medium text-blue-900">{selectedCustomer.cuit}</span>
                  </div>
                )}
                {selectedCustomer.dni && !selectedCustomer.cuit && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">DNI:</span>
                    <span className="font-medium text-blue-900">{selectedCustomer.dni}</span>
                  </div>
                )}
              </div>

              {/* Columna derecha - Estado de cuenta */}
              <div className={`rounded-md p-2 ${loadingBalance
                ? 'bg-gray-100 border border-gray-300'
                : customerBalance && customerBalance > 0
                  ? 'bg-red-100 border border-red-300'
                  : 'bg-green-100 border border-green-300'
                }`}>
                {loadingBalance ? (
                  <div className="flex items-center gap-2 text-gray-700 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando saldo...</span>
                  </div>
                ) : customerBalance && customerBalance > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-red-900 text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      <span>Cliente con Deuda</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-red-700">Saldo Deudor:</span>
                      <span className="text-base font-bold text-red-900">
                        {formatCurrency(customerBalance)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-green-700 text-sm font-medium">
                    Sin deuda
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




