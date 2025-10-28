import { useState, useEffect } from 'react'
import useApi from './useApi'

interface Sale {
  id: number
  date: string
  total: number
  receipt_number?: string
  customer?: {
    id: number
    person?: {
      first_name: string
      last_name: string
    }
  }
  receiptType?: {
    id: number
    name: string
  }
  receipt_type?: {
    id: number
    name: string
  }
  branch?: {
    id: number
    description: string
  }
  customer_name?: string
}

interface UseSalesOptions {
  limit?: number
  branchId?: number | string | Array<number | string>
  externalDeps?: any[]
}

export function useSales(options: UseSalesOptions = {}) {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { request } = useApi()

  const buildParams = () => {
    const params = new URLSearchParams()
    const branchOpt = options.branchId
    if (branchOpt && branchOpt !== 'all') {
      const ids = Array.isArray(branchOpt) ? branchOpt : [branchOpt]
      ids.forEach((id) => params.append('branch_id[]', id.toString()))
    }
    if (options.limit && options.limit > 0) {
      params.append('limit', options.limit.toString())
    }
    return params.toString()
  }

  const fetchSales = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const qs = buildParams()
      const response = await request({
        method: 'GET',
        url: `/sales${qs ? `?${qs}` : ''}`,
      })

      // La API devuelve { data: [...] }
      const salesData = response.data?.data || response.data || []
      let processedSales = Array.isArray(salesData) ? salesData : []
      if (options.limit && options.limit > 0) {
        processedSales = processedSales.slice(0, options.limit)
      }
      setSales(processedSales)
    } catch (err: any) {
      console.error('Error fetching sales:', err)
      setError(err.response?.data?.message || 'Error al cargar las ventas')
      setSales([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
    // Permitir dependencias externas como selectionChangeToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.limit, JSON.stringify(options.branchId), ...(options.externalDeps || [])])

  return {
    sales,
    isLoading,
    error,
    refetch: fetchSales
  }
}

export default useSales
