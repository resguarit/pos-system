import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomerOption } from '@/hooks/useCustomerSearch'

interface CustomerSearchSectionProps {
  customerSearch: string
  customerOptions: CustomerOption[]
  showCustomerOptions: boolean
  selectedCustomer: CustomerOption | null
  onSearchChange: (value: string) => void
  onCustomerSelect: (customer: CustomerOption) => void
  onShowOptionsChange: (show: boolean) => void
  onNewCustomerClick: () => void
}

export function CustomerSearchSection({
  customerSearch,
  customerOptions,
  showCustomerOptions,
  selectedCustomer,
  onSearchChange,
  onCustomerSelect,
  onShowOptionsChange,
  onNewCustomerClick,
}: CustomerSearchSectionProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1">
          <Label>Buscar cliente (DNI o nombre)</Label>
          <div className="relative">
            <Input
              value={customerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => onShowOptionsChange(customerSearch.length >= 1)}
              onBlur={() => setTimeout(() => onShowOptionsChange(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onShowOptionsChange(false)
              }}
              placeholder="Ingrese para buscar..."
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
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Información del Cliente</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
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
              {selectedCustomer.fiscal_condition_name && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Condición Fiscal:</span>
                  <span className="font-medium text-blue-900">{selectedCustomer.fiscal_condition_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



