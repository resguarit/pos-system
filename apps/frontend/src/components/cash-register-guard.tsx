import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useCashRegisterContext } from '@/context/CashRegisterContext'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'

interface CashRegisterGuardProps {
  children: ReactNode
  branchId: number
  operationName?: string
  fallback?: ReactNode
  showInlineAlert?: boolean
}

export default function CashRegisterGuard({ 
  children, 
  branchId, 
  operationName = 'esta operación',
  fallback,
  showInlineAlert = true
}: CashRegisterGuardProps) {
  const { isOpen, isLoading, checkCashRegisterStatus } = useCashRegisterContext()

  // Verificar estado cuando cambie el branchId
  useEffect(() => {
    if (branchId) {
      checkCashRegisterStatus(branchId, false)
    }
  }, [branchId, checkCashRegisterStatus])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isOpen) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showInlineAlert) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              No se puede realizar {operationName}. La caja debe estar abierta.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/caja">
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir Caja
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return <>{children}</>
}
