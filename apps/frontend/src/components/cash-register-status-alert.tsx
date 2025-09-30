import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { useCashRegisterContext } from '@/context/CashRegisterContext'
import { Link } from 'react-router-dom'

interface CashRegisterStatusAlertProps {
  branchId?: number
  showDetails?: boolean
  className?: string
}

export default function CashRegisterStatusAlert({ 
  branchId = 1, 
  showDetails = true,
  className = "" 
}: CashRegisterStatusAlertProps) {
  const { status, isLoading, isOpen, lastCheck, checkCashRegisterStatus, refreshStatus } = useCashRegisterContext()
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
      <Alert className={className}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Verificando estado de la caja...
        </AlertDescription>
      </Alert>
    )
  }

  if (!status) {
    return null
  }

  const operatorName = (status as any)?.cash_register?.user?.username || (status as any)?.user || ''

  return (
    <Alert 
      variant={isOpen ? "default" : "destructive"} 
      className={`${className} ${isOpen ? 'border-green-200 bg-green-50' : ''} ${showDetails ? '' : 'py-2'}`}
    >
      {isOpen ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Badge variant={isOpen ? "default" : "destructive"} className="text-xs">
            {isOpen ? 'Caja Abierta' : 'Caja Cerrada'}
          </Badge>
          
          {showDetails && isOpen && operatorName && (
            <span className="text-sm text-muted-foreground">
              • Operador: {operatorName}
            </span>
          )}
          
          {showDetails && isOpen && (status as any)?.opened_at && (
            <span className="text-sm text-muted-foreground">
              • Apertura: {new Date((status as any).opened_at).toLocaleTimeString()}
            </span>
          )}
          
          {!showDetails && !isOpen && (
            <span className="text-xs text-muted-foreground">
              {status.required_action || 'Debe abrir la caja'}
            </span>
          )}
          
          {showDetails && !isOpen && (
            <span className="text-sm">
              {status.required_action || 'Debe abrir la caja antes de realizar operaciones'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${showDetails ? 'mr-1' : ''} ${isRefreshing ? 'animate-spin' : ''}`} />
            {showDetails ? 'Actualizar' : ''}
          </Button>
          
          {!isOpen && (
            <Button 
              asChild 
              size="sm" 
              className="h-6 px-2 text-xs"
            >
              <Link to="/dashboard/caja">
                <ExternalLink className={`h-3 w-3 ${showDetails ? 'mr-1' : ''}`} />
                {showDetails ? 'Abrir Caja' : 'Abrir'}
              </Link>
            </Button>
          )}
          
          {showDetails && lastCheck && (
            <span className="text-xs text-muted-foreground">
              Última verificación: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
