import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import useApi from '@/hooks/useApi'
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


interface CashRegisterContextType {
  status: CashRegisterStatus | null
  isLoading: boolean
  lastCheck: Date | null
  isOpen: boolean
  checkCashRegisterStatus: (branchId: number, showToast?: boolean) => Promise<boolean>
  validateCashRegisterForOperation: (operationName?: string) => Promise<boolean>
  refreshStatus: (branchId: number) => Promise<void>
  clearStatus: () => void
}

const CashRegisterContext = createContext<CashRegisterContextType | undefined>(undefined)

interface CashRegisterProviderProps {
  children: ReactNode
}

export function CashRegisterProvider({ children }: CashRegisterProviderProps) {
  const { request } = useApi()
  const [status, setStatus] = useState<CashRegisterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null)

  const checkCashRegisterStatus = useCallback(async (branchId: number, showToast: boolean = false): Promise<boolean> => {
    if (!branchId) return false
    
    setIsLoading(true)
    try {
      // Usar el mismo endpoint que CajaPage
      const response = await request({
        method: 'GET',
        url: `/cash-registers/current?branch_id=${branchId}`,
      })

      // Procesar la respuesta del mismo endpoint que CajaPage
      const registerData = response.data?.data || response.data
      
      if (registerData && registerData.id) {
        // Caja abierta - crear objeto de estado compatible
        const statusData: CashRegisterStatus = {
          is_open: true,
          cash_register: registerData,
          branch_id: branchId.toString(),
          opened_at: registerData.opened_at,
          initial_amount: registerData.initial_amount,
          user: registerData.user?.username || ''
        }
        
        setStatus(statusData)
        setLastCheck(new Date())
        setCurrentBranchId(branchId)

        if (showToast) {
          toast.success('Caja abierta y disponible para operaciones')
        }

        return true
      } else {
        // Caja cerrada
        const statusData: CashRegisterStatus = {
          is_open: false,
          cash_register: null,
          branch_id: branchId.toString(),
          required_action: 'Debe abrir la caja antes de realizar operaciones'
        }
        
        setStatus(statusData)
        setLastCheck(new Date())
        setCurrentBranchId(branchId)

        if (showToast) {
          toast.warning('No hay caja abierta. Debe abrir la caja antes de realizar operaciones.')
        }

        return false
      }
    } catch (error: any) {
      console.error('Error checking cash register status:', error)
      
      // Si es 404, significa que no hay caja abierta
      if (error.response?.status === 404) {
        const statusData: CashRegisterStatus = {
          is_open: false,
          cash_register: null,
          branch_id: branchId.toString(),
          required_action: 'Debe abrir la caja antes de realizar operaciones'
        }
        
        setStatus(statusData)
        setLastCheck(new Date())
        setCurrentBranchId(branchId)

        if (showToast) {
          toast.warning('No hay caja abierta. Debe abrir la caja antes de realizar operaciones.')
        }

        return false
      }
      
      if (showToast) {
        toast.error('Error al verificar el estado de la caja')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [request])

  const validateCashRegisterForOperation = useCallback(async (operationName: string = 'esta operación'): Promise<boolean> => {
    if (!currentBranchId) {
      toast.error('No se ha seleccionado una sucursal')
      return false
    }

    const isOpen = await checkCashRegisterStatus(currentBranchId, false)
    
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
  }, [currentBranchId, checkCashRegisterStatus])

  const refreshStatus = useCallback(async (branchId: number) => {
    await checkCashRegisterStatus(branchId, true)
  }, [checkCashRegisterStatus])

  const clearStatus = useCallback(() => {
    setStatus(null)
    setLastCheck(null)
    setCurrentBranchId(null)
  }, [])

  // Auto-refresh status every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentBranchId) {
        checkCashRegisterStatus(currentBranchId, false)
      }
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [currentBranchId, checkCashRegisterStatus])

  const value: CashRegisterContextType = {
    status,
    isLoading,
    lastCheck,
    isOpen: status?.is_open || false,
    checkCashRegisterStatus,
    validateCashRegisterForOperation,
    refreshStatus,
    clearStatus
  }

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  )
}

export function useCashRegisterContext() {
  const context = useContext(CashRegisterContext)
  if (context === undefined) {
    throw new Error('useCashRegisterContext must be used within a CashRegisterProvider')
  }
  return context
}
