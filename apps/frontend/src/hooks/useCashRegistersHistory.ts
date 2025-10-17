import { useState, useCallback } from "react"
import useApi from "@/hooks/useApi"

interface UseCashRegistersHistoryProps {
  selectedBranchIdsArray: number[]
}

interface DateFilters {
  date_range?: string
  custom_dates?: {
    from?: string
    to?: string
  }
}

export const useCashRegistersHistory = ({ selectedBranchIdsArray }: UseCashRegistersHistoryProps) => {
  const { request } = useApi()
  
  const [cashRegistersHistory, setCashRegistersHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadCashRegistersHistory = useCallback(async (filters?: DateFilters) => {
    if (selectedBranchIdsArray.length === 0) {
      return
    }
    
    try {
      setLoading(true)
      
      const requestParams: any = {
        branch_ids: selectedBranchIdsArray
      }
      
      // Agregar filtros si existen
      if (filters) {
        requestParams.filters = {}
        
        if (filters.date_range) {
          requestParams.filters.date_range = filters.date_range
          
          if (filters.date_range === 'custom' && filters.custom_dates) {
            requestParams.filters.custom_dates = filters.custom_dates
          }
        }
      }
      
      const response = await request({
        method: 'GET',
        url: `/cash-registers/cash-registers-history`,
        params: requestParams
      })
      
      const data = response.data
      
      // El backend devuelve directamente el array de cajas
      if (data && Array.isArray(data)) {
        setCashRegistersHistory(data)
      } else if (data && data.data && Array.isArray(data.data)) {
        setCashRegistersHistory(data.data)
      } else {
        setCashRegistersHistory([])
      }
    } catch (error) {
      console.error('Error loading cash registers history:', error)
      setCashRegistersHistory([])
    } finally {
      setLoading(false)
    }
  }, [selectedBranchIdsArray, request])

  return {
    cashRegistersHistory,
    loading,
    loadCashRegistersHistory
  }
}
