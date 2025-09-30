import { useState, useEffect } from "react"
import useApi from "./useApi"

interface SalesSummary {
  total_sales: number
  sales_count: number
  average_sale: number
  growth_percentage: number
  period: {
    start: string
    end: string
  }
}

interface StockAlert {
  product_id: number
  product_name: string
  branch_id: number
  branch_name: string
  current_quantity: number
  min_stock: number
  status: 'out_of_stock' | 'low_stock'
}

interface SalesByBranch {
  branch_id: number
  branch_name: string
  total: number
  count: number
}

interface MonthlySalesData {
  name: string
  total: number
}

interface GeneralStats {
  total_sales: number
  sales_count: number
  active_products: number
  unique_customers: number
}

interface DashboardOptions {
  branchId?: number | string | Array<number | string>
  startDate?: string
  endDate?: string
  year?: number
  limit?: number
  externalDeps?: any[]
}

export function useDashboard(options: DashboardOptions = {}) {
  const { request } = useApi()
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null)
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySalesData[]>([])
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildParams = (additionalParams: Record<string, any> = {}) => {
    const params = new URLSearchParams()
    const branchOpt = options.branchId
    if (branchOpt && branchOpt !== 'all') {
      const ids = Array.isArray(branchOpt) ? branchOpt : [branchOpt]
      ids.forEach((id) => params.append('branch_id[]', id.toString()))
    }
    if (options.startDate) params.append('start_date', options.startDate)
    if (options.endDate) params.append('end_date', options.endDate)
    if (options.year) params.append('year', String(options.year))
    if (options.limit) params.append('limit', String(options.limit))

    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value))
    })

    return params.toString()
  }

  const fetchSalesSummary = async () => {
    try {
      const qs = buildParams()
      const response = await request({ method: "GET", url: `/dashboard/sales-summary${qs ? `?${qs}` : ''}` })
      setSalesSummary(response)
    } catch (err: any) {
      console.error("Error fetching sales summary:", err)
      setError(err.message)
    }
  }

  const fetchStockAlerts = async () => {
    try {
      const qs = buildParams()
      const response = await request({ method: "GET", url: `/dashboard/stock-alerts${qs ? `?${qs}` : ''}` })
      setStockAlerts(Array.isArray(response) ? response : [])
    } catch (err: any) {
      console.error("Error fetching stock alerts:", err)
      setError(err.message)
    }
  }

  const fetchSalesByBranch = async () => {
    try {
      const qs = buildParams()
      const response = await request({ method: "GET", url: `/dashboard/sales-by-branch${qs ? `?${qs}` : ''}` })
      setSalesByBranch(Array.isArray(response) ? response : [])
    } catch (err: any) {
      console.error("Error fetching sales by branch:", err)
      setError(err.message)
    }
  }

  const fetchMonthlySales = async () => {
    try {
      const qs = buildParams()
      const response = await request({ method: "GET", url: `/dashboard/monthly-sales${qs ? `?${qs}` : ''}` })
      setMonthlySales(Array.isArray(response) ? response : [])
    } catch (err: any) {
      console.error("Error fetching monthly sales:", err)
      setError(err.message)
    }
  }

  const fetchGeneralStats = async () => {
    try {
      const qs = buildParams()
      const response = await request({ method: "GET", url: `/dashboard/general-stats${qs ? `?${qs}` : ''}` })
      setGeneralStats(response)
    } catch (err: any) {
      console.error("Error fetching general stats:", err)
      setError(err.message)
    }
  }

  const fetchAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchSalesSummary(),
        fetchStockAlerts(),
        fetchSalesByBranch(),
        fetchMonthlySales(),
        fetchGeneralStats(),
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // Permitir dependencias externas como selectionChangeToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options.branchId), options.startDate, options.endDate, options.year, ...(options.externalDeps || [])])

  return {
    salesSummary,
    stockAlerts,
    salesByBranch,
    monthlySales,
    generalStats,
    isLoading,
    error,
    refetch: fetchAll,
    refetchSalesSummary: fetchSalesSummary,
    refetchStockAlerts: fetchStockAlerts,
    refetchSalesByBranch: fetchSalesByBranch,
    refetchMonthlySales: fetchMonthlySales,
    refetchGeneralStats: fetchGeneralStats,
  }
}
