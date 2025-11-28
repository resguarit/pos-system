import { useState, useEffect } from 'react'
import useApi from './useApi'

interface PaymentMethodCategory {
  id: number
  name: string
  description: string
}

interface PaymentMethodsOptimized {
  categorized: {
    cash: PaymentMethodCategory[]
    card: PaymentMethodCategory[]
    transfer: PaymentMethodCategory[]
    other: PaymentMethodCategory[]
  }
  all: PaymentMethodCategory[]
  keywords: {
    cash: string[]
    card: string[]
    transfer: string[]
  }
}

interface CashRegisterOptimized {
  id: number
  branch: any
  user: any
  opened_at: string
  initial_amount: number
  expected_cash_balance: number
  cash_difference?: number
  payment_method_totals: Record<string, number>
  status: string
  today_income?: number
  today_expenses?: number
}

interface UseCashRegisterOptimizedReturn {
  currentCashRegister: CashRegisterOptimized | null
  paymentMethods: PaymentMethodsOptimized | null
  loading: boolean
  error: string | null
  refetch: () => void
  isCashPaymentMethod: (methodName: string) => boolean
}

export default function useCashRegisterOptimized(branchId: number | null): UseCashRegisterOptimizedReturn {
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegisterOptimized | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsOptimized | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { request } = useApi()

  const isCashPaymentMethod = (methodName: string): boolean => {
    if (!paymentMethods) return false
    
    const cashKeywords = paymentMethods.keywords.cash
    const normalizedName = methodName.toLowerCase()
    
    return cashKeywords.some(keyword => normalizedName.includes(keyword))
  }

  const fetchCurrentCashRegister = async () => {
    if (!branchId) return

    try {
      setLoading(true)
      setError(null)

      const response = await request({
        method: 'GET',
        url: `/cash-registers/current-optimized?branch_id=${branchId}`
      })
      
      if (response && response.data) {
        setCurrentCashRegister(response.data)
      } else {
        setCurrentCashRegister(null)
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener información de caja')
      setCurrentCashRegister(null)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/cash-registers/payment-methods-optimized'
      })
      
      if (response && response.data) {
        setPaymentMethods(response.data)
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err)
      // No mostrar error al usuario para métodos de pago, usar fallback
    }
  }

  const refetch = async () => {
    setLoading(true)
    await fetchCurrentCashRegister()
    setLoading(false)
  }

  // Cargar payment methods solo una vez al montar el componente
  useEffect(() => {
    if (!paymentMethods) {
      fetchPaymentMethods()
    }
  }, []) // Sin dependencias para que solo se ejecute una vez

  // Cargar cash register cuando cambie branchId
  useEffect(() => {
    if (!branchId) return
    
    // Limpiar estado inmediatamente cuando cambia branchId
    setCurrentCashRegister(null)
    setError(null)
    
    const fetchData = async () => {
      setLoading(true)
      await fetchCurrentCashRegister()
      setLoading(false)
    }

    fetchData()
  }, [branchId])

  return {
    currentCashRegister,
    paymentMethods,
    loading,
    error,
    refetch,
    isCashPaymentMethod
  }
}
