import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  RefreshCw,
  Loader2,
  Info,
  ChevronDown
} from 'lucide-react'
import { useBranch } from '@/context/BranchContext'
import useApi from '@/hooks/useApi'
import { toast } from 'sonner'

interface MultipleBranchesCashStatusProps {
  className?: string
  showOpenButton?: boolean
  compact?: boolean
}

interface CashRegisterStatus {
  open_registers: Array<{
    id: number
    branch_id: number
    branch: {
      id: number
      description: string
    }
    user: {
      username: string
    }
    opened_at: string
    initial_amount: string
  }>
  closed_branches: Array<{
    branch_id: number
  }>
  total_branches: number
  open_count: number
  closed_count: number
  all_open: boolean
  all_closed: boolean
  mixed_status: boolean
}

export default function MultipleBranchesCashStatus({ 
  className = "",
  showOpenButton = true,
  compact = false
}: MultipleBranchesCashStatusProps) {
  const { request } = useApi()
  const { selectedBranchIds, branches } = useBranch()
  const [status, setStatus] = useState<CashRegisterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkMultipleBranchesStatus = useCallback(async (showToast = false) => {
    if (selectedBranchIds.length === 0) {
      setStatus(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await request({
        method: 'GET',
        url: `/cash-registers/check-multiple-branches-status`,
        params: {
          branch_ids: selectedBranchIds
        }
      })

      setStatus(response.data)
      
      if (showToast) {
        showStatusToast(response.data)
      }
    } catch (error: any) {
      console.error('Error checking multiple branches cash status:', error)
      if (showToast) {
        toast.error('Error al verificar el estado de las cajas')
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranchIds, request])

  const showStatusToast = useCallback((statusData: CashRegisterStatus) => {
    if (statusData.all_open) {
      toast.success('Todas las sucursales tienen caja abierta')
    } else if (statusData.all_closed) {
      toast.warning('Todas las sucursales tienen caja cerrada')
    } else {
      toast.info(`Estado mixto: ${statusData.open_count} abiertas, ${statusData.closed_count} cerradas`)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await checkMultipleBranchesStatus(true)
    setIsRefreshing(false)
  }, [checkMultipleBranchesStatus])

  const getBranchName = useCallback((branchId: number) => {
    const branch = branches.find(b => b.id === branchId)
    return branch?.description || `Sucursal ${branchId}`
  }, [branches])

  const statusBadge = useMemo(() => {
    if (!status) return null
    
    if (status.all_open) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {compact ? 'Todas Abiertas' : 'Todas las Cajas Abiertas'}
        </Badge>
      )
    } else if (status.all_closed) {
      return (
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 border-red-500 text-white">
          <XCircle className="h-3 w-3 mr-1" />
          {compact ? 'Todas Cerradas' : 'Todas las Cajas Cerradas'}
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {compact ? 'Estado Mixto' : `Estado Mixto (${status.open_count}/${status.total_branches})`}
        </Badge>
      )
    }
  }, [status, compact])

  const statusMessage = useMemo(() => {
    if (!status) return ''
    
    if (status.all_open) {
      return 'Todas las sucursales seleccionadas tienen caja abierta y están disponibles para operaciones.'
    } else if (status.all_closed) {
      return 'Todas las sucursales seleccionadas tienen caja cerrada. Debe abrir al menos una caja para realizar operaciones.'
    } else {
      return `Estado mixto: ${status.open_count} sucursales con caja abierta, ${status.closed_count} cerradas.`
    }
  }, [status])

  // Verificar estado cuando cambien las sucursales seleccionadas
  useEffect(() => {
    checkMultipleBranchesStatus()
  }, [checkMultipleBranchesStatus])

  // Early returns después de todos los hooks
  if (selectedBranchIds.length === 0) {
    return null
  }

  if (selectedBranchIds.length === 1) {
    // Si solo hay una sucursal, no mostrar este componente
    return null
  }

  if (isLoading && !status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="animate-pulse">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Verificando cajas...
        </Badge>
      </div>
    )
  }

  if (!status) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Badge */}
      {statusBadge}
      
      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="h-8 w-8 p-0"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>

      {/* Dropdown for details - only show if mixed status */}
      {status.mixed_status && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4" align="start">
            <div className="space-y-3">
              {/* Open Registers */}
              {status.open_registers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">
                    Cajas Abiertas ({status.open_count})
                  </h4>
                  <div className="space-y-2">
                    {status.open_registers.map((register) => (
                      <div key={register.id} className="flex items-center justify-between text-sm bg-green-50 p-2 rounded border border-green-200">
                        <div>
                          <span className="font-medium text-green-800">
                            {getBranchName(register.branch_id)}
                          </span>
                          <div className="text-xs text-green-600">
                            Operador: {register.user.username}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-green-700">
                          ${parseFloat(register.initial_amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closed Branches */}
              {status.closed_branches.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2">
                    Cajas Cerradas ({status.closed_count})
                  </h4>
                  <div className="space-y-2">
                    {status.closed_branches.map((branch) => (
                      <div key={branch.branch_id} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded border border-red-200">
                        <span className="font-medium text-red-800">
                          {getBranchName(branch.branch_id)}
                        </span>
                        <span className="text-sm text-red-600">
                          Caja cerrada
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button in dropdown */}
              {showOpenButton && status.closed_count > 0 && (
                <div className="pt-2 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      window.location.href = '/dashboard/caja'
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 border-green-500 text-white"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Abrir Cajas Cerradas
                  </Button>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Action Button for all closed - outside dropdown */}
      {showOpenButton && status.all_closed && (
        <Button
          variant="default"
          size="sm"
          className="bg-green-500 hover:bg-green-600 border-green-500 text-white"
          onClick={() => {
            window.location.href = '/dashboard/caja'
          }}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Abrir Cajas
        </Button>
      )}
    </div>
  )
}
