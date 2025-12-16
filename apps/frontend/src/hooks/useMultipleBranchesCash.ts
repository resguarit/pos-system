import { useState, useCallback } from "react"
import useApi from "@/hooks/useApi"

interface UseMultipleBranchesCashProps {
  selectedBranchIdsArray: number[]
}

interface DateFilters {
  date_range?: string
  custom_dates?: {
    from?: string
    to?: string
  }
}

interface AllFilters extends DateFilters {
  search?: string
  movement_type?: string
  branch?: string
}

export const useMultipleBranchesCash = ({ selectedBranchIdsArray }: UseMultipleBranchesCashProps) => {
  const { request } = useApi()
  
  const [multipleCashRegisters, setMultipleCashRegisters] = useState<Record<number, any>>({})
  const [multipleCashRegistersLoading, setMultipleCashRegistersLoading] = useState<Record<number, boolean>>({})
  const [allMovements, setAllMovements] = useState<any[]>([])
  const [allMovementsLoading, setAllMovementsLoading] = useState(false)
  const [consolidatedStats, setConsolidatedStats] = useState<any>({})

  // Estado de paginación inicializado
  const [pagination, setPagination] = useState<{
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0
  })

  // Cargar caja de sucursal específica
  const loadCashRegisterForBranch = useCallback(async (branchId: number) => {
    try {
      setMultipleCashRegistersLoading(prev => ({ ...prev, [branchId]: true }))
      const response = await request({
        method: 'GET',
        url: `/cash-registers/current?branch_id=${branchId}`,
      })
      const registerData = response.data?.data || response.data
      
      if (registerData && registerData.id) {
        setMultipleCashRegisters(prev => ({ ...prev, [branchId]: registerData }))
      } else {
        setMultipleCashRegisters(prev => ({ ...prev, [branchId]: null }))
      }
    } catch (error) {
      console.error(`Error loading cash register for branch ${branchId}:`, error)
      setMultipleCashRegisters(prev => ({ ...prev, [branchId]: null }))
    } finally {
      setMultipleCashRegistersLoading(prev => ({ ...prev, [branchId]: false }))
    }
  }, [request])

  // Cargar datos consolidados
  // NOTA: Cambiamos perPage a 10 por defecto para coincidir con tu API
  const loadMultipleBranchesData = useCallback(async (filters?: AllFilters, page = 1, perPage = 10) => {
    if (selectedBranchIdsArray.length === 0) return
    
    try {
      setAllMovementsLoading(true)
      
      const requestParams: any = {
        branch_ids: selectedBranchIdsArray,
        page,
        per_page: perPage
      }
      
      if (filters) {
        requestParams.filters = {}
        if (filters.date_range) {
          requestParams.filters.date_range = filters.date_range
          if (filters.date_range === 'custom' && filters.custom_dates) {
            requestParams.filters.custom_dates = filters.custom_dates
          }
        }
        if (filters.search) requestParams.filters.search = filters.search
        if (filters.movement_type) requestParams.filters.movement_type = filters.movement_type
        if (filters.branch) requestParams.filters.branch = filters.branch
      }
      
      const response = await request({
        method: 'GET',
        url: `/cash-registers/multiple-branches`,
        params: requestParams
      })
      
      // useApi devuelve response.data de Axios: { message: "...", data: { all_movements, pagination, ... } }
      // Necesitamos acceder a response.data para obtener el contenido real
      const apiData = response?.data || response
      
      if (apiData) {
        if (Array.isArray(apiData.all_movements)) {
          setAllMovements(apiData.all_movements)
        } else {
          setAllMovements([])
        }

        // Capturamos la paginación
        if (apiData.pagination) {
          setPagination(apiData.pagination)
        }

        if (Array.isArray(apiData.cash_registers)) {
          const cashRegistersMap: Record<number, any> = {}
          apiData.cash_registers.forEach((cashRegister: any) => {
             if (cashRegister?.branch_id) {
                cashRegistersMap[cashRegister.branch_id] = cashRegister
             }
          })
          setMultipleCashRegisters(cashRegistersMap)
        }

        if (apiData.consolidated_stats) {
          setConsolidatedStats(apiData.consolidated_stats)
        }
      }
    } catch (error) {
      console.error('Error loading multiple branches data:', error)
      setAllMovements([])
    } finally {
      setAllMovementsLoading(false)
    }
  }, [selectedBranchIdsArray, request])

  return {
    multipleCashRegisters,
    multipleCashRegistersLoading,
    allMovements,
    allMovementsLoading,
    consolidatedStats,
    pagination,
    loadCashRegisterForBranch,
    loadMultipleBranchesData
  }
}