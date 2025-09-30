import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { useCashRegisterContext } from '@/context/CashRegisterContext'
import { Link } from 'react-router-dom'

interface CashRegisterStatusBadgeProps {
  branchId?: number
  showRefreshButton?: boolean
  showOpenButton?: boolean
  compact?: boolean
  showOperator?: boolean
  showOpenTime?: boolean
  className?: string
}

export default function CashRegisterStatusBadge({ 
  branchId = 1, 
  showRefreshButton = true,
  showOpenButton = true,
  compact = false,
  showOperator = true,
  showOpenTime = true,
  className = "" 
}: CashRegisterStatusBadgeProps) {
  const { status, isLoading, isOpen, checkCashRegisterStatus, refreshStatus } = useCashRegisterContext()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Verificar estado cuando cambie el branchId
  useEffect(() => {
    if (branchId) {
      checkCashRegisterStatus(branchId, false)
    }
  }, [branchId, checkCashRegisterStatus])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshStatus(branchId)
    setIsRefreshing(false)
  }

  if (isLoading && !status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Verificando...
        </Badge>
      </div>
    )
  }

  if (!status) {
    return null
  }

  return (
    <div className={`
      ${!compact && isOpen 
        ? 'bg-green-50 border border-green-200 rounded-lg p-3' 
        : !compact && !isOpen
        ? 'bg-red-50 border border-red-200 rounded-lg p-3'
        : ''
      } 
      flex items-center gap-2 flex-wrap ${className}
    `}>
      <Badge 
        variant={isOpen ? "default" : "destructive"} 
        className={`
          ${isOpen 
            ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white' 
            : 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
          } 
          font-medium ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}
        `}
      >
        {isOpen ? '✓ Caja Abierta' : '✗ Caja Cerrada'}
      </Badge>
      
      {!compact && isOpen && showOperator && status.cash_register?.user?.username && (
        <span className="text-sm text-green-700 font-medium">
          Operador: {status.cash_register.user.username}
        </span>
      )}
      
      {!compact && isOpen && showOpenTime && status.cash_register?.opened_at && (
        <span className="text-sm text-green-600">
          • Apertura: {new Date(status.cash_register.opened_at).toLocaleTimeString()}
        </span>
      )}
      
      {!compact && !isOpen && (
        <span className="text-sm text-red-700 font-medium bg-red-50 px-2 py-1 rounded">
          {status.required_action || 'Debe abrir la caja antes de operar'}
        </span>
      )}

      {(showRefreshButton || (showOpenButton && !isOpen)) && (
        <div className="flex items-center gap-1">
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`h-7 px-3 text-xs ${
                !compact && isOpen 
                  ? 'text-green-600 hover:text-green-700 hover:bg-green-100' 
                  : ''
              }`}
              title="Actualizar estado"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''} mr-1`} />
              Actualizar
            </Button>
          )}
          
          {showOpenButton && !isOpen && (
            <Button 
              asChild 
              size="sm" 
              variant="outline"
              className="h-7 px-3 text-xs border-red-200 text-red-700 hover:bg-red-50"
            >
              <Link to="/dashboard/caja">
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir Caja
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
