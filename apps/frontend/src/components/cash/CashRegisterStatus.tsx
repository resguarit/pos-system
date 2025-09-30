import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCcw,
  DollarSign
} from 'lucide-react'
import type { CashRegister, CashStats } from '@/types/cash.types'

interface CashRegisterStatusProps {
  cashRegister?: CashRegister
  stats: CashStats
  loading: boolean
  onOpenRegister: () => void
  onCloseRegister: () => void
  onRefresh: () => void
  isProcessing: boolean
}

const CashRegisterStatus = React.memo(function CashRegisterStatus({
  cashRegister,
  stats,
  loading,
  onOpenRegister,
  onCloseRegister,
  onRefresh,
  isProcessing
}: CashRegisterStatusProps) {
  const isOpen = cashRegister?.is_open ?? false

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Estado de Caja
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Estado de Caja
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isProcessing}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Estado de la caja */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Caja Abierta
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                <Badge variant="destructive">
                  Caja Cerrada
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            {isOpen ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCloseRegister}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Cerrar Caja
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onOpenRegister}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Abrir Caja
              </Button>
            )}
          </div>
        </div>

        {/* Información de la caja */}
        {cashRegister && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Caja:</span>
                <span className="ml-2 font-medium">{cashRegister.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Balance inicial:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(cashRegister.opening_balance)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Abierta por:</span>
                <span className="ml-2 font-medium">{cashRegister.opened_by_user_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Fecha de apertura:</span>
                <span className="ml-2 font-medium">
                  {formatDate(cashRegister.opened_at)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance actual */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Balance Actual</span>
            </div>
            <span className="text-2xl font-bold text-blue-900">
              {formatCurrency(stats.currentBalance)}
            </span>
          </div>
        </div>

        {/* Resumen de movimientos */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-green-600 font-semibold">
              {formatCurrency(stats.totalIncome)}
            </div>
            <div className="text-gray-600">Ingresos</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-semibold">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <div className="text-gray-600">Egresos</div>
          </div>
          <div className="text-center">
            <div className="text-blue-600 font-semibold">
              {stats.movementCount}
            </div>
            <div className="text-gray-600">Movimientos</div>
          </div>
        </div>

        {/* Alerta si hay diferencia en efectivo */}
        {Math.abs(stats.currentBalance - stats.cashOnlyBalance) > 0.01 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Hay una diferencia entre el balance total ({formatCurrency(stats.currentBalance)}) 
              y el balance en efectivo ({formatCurrency(stats.cashOnlyBalance)}). 
              Esto puede deberse a movimientos de ventas o compras.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
})

export default CashRegisterStatus


