import { useState, useEffect, useCallback } from 'react'
import useApi from './useApi'
import { toast } from 'sonner'

interface CashRegisterStatus {
  is_open: boolean
  cash_register: {
    id: number
    user_id: number
    branch_id: number
    initial_amount: string
    final_amount?: string
    opened_at: string
    closed_at?: string
    status: string
    notes?: string
    created_at: string
    updated_at: string
    branch: {
      id: number
      description: string
      address: string
      phone: string
      email: string
      point_of_sale: string
      manager_id?: number
      color: string
      status: number
      created_at: string
      updated_at: string
      deleted_at?: string
    }
    user: {
      id: number
      person_id: number
      email: string
      username: string
      email_verified_at?: string
      active: boolean
      role_id: number
      last_login_at?: string
      created_at: string
      updated_at: string
      deleted_at?: string
    }
  } | null
  branch_id: string
  opened_at?: string
  initial_amount?: string
  user?: string
  required_action?: string
}

interface CashRegisterStatusResponse {
  success: boolean
  is_open: boolean
  message: string
  data: CashRegisterStatus
}

export const useCashRegisterStatus = (branchId: number = 1) => {
  const { request } = useApi()
  const [status, setStatus] = useState<CashRegisterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkCashRegisterStatus = useCallback(async (showToast: boolean = false): Promise<boolean> => {
    if (!branchId) return false
    
    setIsLoading(true)
    try {
      const response: CashRegisterStatusResponse = await request({
        method: 'GET',
        url: `/cash-registers/check-status?branch_id=${branchId}`,
      })

      // Agregar el is_open al objeto data para consistencia
      const statusData = {
        ...response.data,
        is_open: response.is_open
      }
      
      setStatus(statusData)
      setLastCheck(new Date())

      if (showToast) {
        if (response.is_open) {
          toast.success('Caja abierta y disponible para operaciones')
        } else {
          toast.warning('No hay caja abierta. Debe abrir la caja antes de realizar operaciones.')
        }
      }

      return response.is_open
    } catch (error: any) {
      console.error('Error checking cash register status:', error)
      if (showToast) {
        toast.error('Error al verificar el estado de la caja')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [branchId, request])

  /**
   * Check cash register for a specific branch and return the cash register ID if open
   * @param checkBranchId - Branch ID to check
   * @returns Cash register ID if open, null otherwise
   */
  const getCashRegisterIdForBranch = useCallback(async (checkBranchId: number): Promise<number | null> => {
    try {
      const response: CashRegisterStatusResponse = await request({
        method: 'GET',
        url: `/cash-registers/check-status?branch_id=${checkBranchId}`,
      })

      if (response.is_open && response.data?.cash_register?.id) {
        return response.data.cash_register.id
      }
      return null
    } catch (error) {
      console.error('Error getting cash register for branch:', checkBranchId, error)
      return null
    }
  }, [request])

  const validateCashRegisterForOperation = useCallback(async (operationName: string = 'esta operación'): Promise<boolean> => {
    const isOpen = await checkCashRegisterStatus(false)
    
    if (!isOpen) {
      toast.error(`No se puede realizar ${operationName}. Debe abrir la caja primero.`, {
        action: {
          label: 'Abrir Caja',
          onClick: () => {
            // Redirigir a la página de caja
            window.location.href = '/dashboard/caja'
          }
        }
      })
      return false
    }
    
    return true
  }, [checkCashRegisterStatus])

  const requireCashRegisterOpen = useCallback((callback: () => void | Promise<void>, operationName: string = 'esta operación') => {
    return async () => {
      const isValidated = await validateCashRegisterForOperation(operationName)
      if (isValidated) {
        await callback()
      }
    }
  }, [validateCashRegisterForOperation])

  // Auto-check status on mount and when branchId changes
  useEffect(() => {
    if (branchId) {
      checkCashRegisterStatus(false)
    }
  }, [branchId, checkCashRegisterStatus])

  // Auto-refresh status every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (branchId) {
        checkCashRegisterStatus(false)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [branchId, checkCashRegisterStatus])

  return {
    status,
    isLoading,
    lastCheck,
    isOpen: status?.is_open || false,
    checkCashRegisterStatus,
    getCashRegisterIdForBranch,
    validateCashRegisterForOperation,
    requireCashRegisterOpen,
    refreshStatus: () => checkCashRegisterStatus(true)
  }
}
