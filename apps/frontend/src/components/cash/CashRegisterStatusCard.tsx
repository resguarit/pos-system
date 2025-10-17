import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw, Wallet, Eye } from "lucide-react"
import { formatCurrency } from "@/utils/cash-register-utils"

interface CashRegisterStatusCardProps {
  branchId: number
  cashRegister: any
  canOpenCloseCashRegister: boolean
  onRefresh: () => void
  onOpenCashRegister: (branchId: number) => void
  onCloseCashRegister: (cashRegisterId: number, branchId: number) => void
  branchInfo?: any
  onViewBranchDetails?: (branchId: number) => void
}

export const CashRegisterStatusCard = ({ 
  branchId, 
  cashRegister, 
  canOpenCloseCashRegister, 
  onRefresh, 
  onOpenCashRegister, 
  onCloseCashRegister, 
  branchInfo, 
  onViewBranchDetails 
}: CashRegisterStatusCardProps) => {
  const isOpen = cashRegister && cashRegister.status === 'open'
  const operatorName = cashRegister?.user?.username || 'No especificado'
  const openedAt = cashRegister?.opened_at ? new Date(cashRegister.opened_at).toLocaleTimeString() : null
  const initialAmount = cashRegister?.initial_amount ? parseFloat(cashRegister.initial_amount) : 0
  const branchName = cashRegister?.branch?.description || branchInfo?.description || `Sucursal ${branchId}`

  return (
    <Card className={`${isOpen ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {branchName}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Badge de estado */}
        <div className="flex justify-center">
          <Badge 
            variant={isOpen ? "default" : "destructive"} 
            className={`
              ${isOpen 
                ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white' 
                : 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
              } 
              font-medium px-4 py-2 text-sm
            `}
          >
            {isOpen ? '✓ Caja Abierta' : '✗ Caja Cerrada'}
          </Badge>
        </div>
        
        {/* Información de la caja abierta */}
        {isOpen && (
          <div className="space-y-3 bg-white/60 rounded-lg p-3 border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Operador:</span>
              <span className="text-gray-900 font-semibold">{operatorName}</span>
            </div>
            
            {openedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Apertura:</span>
                <span className="text-gray-900">{openedAt}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Saldo inicial:</span>
              <span className="text-gray-900 font-semibold">{formatCurrency(initialAmount)}</span>
            </div>
          </div>
        )}
        
        {/* Mensaje para caja cerrada */}
        {!isOpen && (
          <div className="bg-white/60 rounded-lg p-3 border">
            <div className="space-y-2">
              <div className="text-center text-sm text-red-700 font-medium">
                Debe abrir la caja antes de operar
              </div>
              {branchInfo?.description && (
                <div className="text-center text-xs text-gray-600">
                  {branchInfo.description}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="pt-2 space-y-2">
          {/* Botón para ver detalles de la sucursal */}
          {onViewBranchDetails && (
            <Button 
              variant="outline"
              onClick={() => onViewBranchDetails(branchId)}
              className="w-full font-medium"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalles
            </Button>
          )}
          
          {/* Botones de abrir/cerrar caja */}
          {canOpenCloseCashRegister && (
            <>
              {!isOpen ? (
                <Button 
                  onClick={() => onOpenCashRegister(branchId)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Abrir Caja
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={() => onCloseCashRegister(cashRegister.id, branchId)}
                  className="w-full font-medium"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Cerrar Caja
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
