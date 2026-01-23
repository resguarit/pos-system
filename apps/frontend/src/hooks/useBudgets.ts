import { useState, useEffect, useCallback } from 'react'
import useApi from '@/hooks/useApi'
import { toast } from 'sonner'

interface Budget {
    id: number
    date: string
    date_display: string
    receipt_type: string
    receipt_number: string
    customer: string
    customer_id: number | null
    // Datos completos del cliente para conversión a venta
    customer_data?: {
        id: number
        name: string
        dni: string | null
        cuit: string | null
        fiscal_condition_id: number | null
        fiscal_condition_name: string | null
    } | null
    creator: string
    creator_id: number | null
    items_count: number
    total: number
    status: string
    branch: string
    branch_color?: string
    branch_id: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items?: any[]
    payments?: { payment_method_id: number; amount: number; payment_method_name: string; discount_percentage?: number }[]
    // Campos de conversión
    converted_to_sale_id?: number | null
    converted_to_sale_receipt?: string | null
    converted_at?: string | null
    converted_from_budget_id?: number | null
    converted_from_budget_receipt?: string | null
}

interface UseBudgetsOptions {
    branchIds?: number[]
    status?: 'active' | 'converted' | 'annulled' | 'all'
    fromDate?: string
    toDate?: string
    search?: string
    page?: number
    limit?: number
}

export interface PaginationState {
    total: number
    last_page: number
    current_page: number
    per_page: number
}

export function useBudgets(options: UseBudgetsOptions = {}) {
    const { request, loading } = useApi()
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [pagination, setPagination] = useState<PaginationState>({
        total: 0,
        last_page: 1,
        current_page: 1,
        per_page: 15
    })
    const [actionLoading, setActionLoading] = useState<number | null>(null)

    const fetchBudgets = useCallback(async () => {
        try {
            const params = new URLSearchParams()

            if (options.branchIds && options.branchIds.length > 0) {
                options.branchIds.forEach(id => params.append('branch_id[]', id.toString()))
            }
            if (options.status) {
                params.append('status', options.status)
            }
            if (options.fromDate) {
                params.append('from_date', options.fromDate)
            }
            if (options.toDate) {
                params.append('to_date', options.toDate)
            }
            if (options.search) {
                params.append('search', options.search)
            }
            if (options.page) {
                params.append('page', options.page.toString())
            }
            if (options.limit) {
                params.append('limit', options.limit.toString())
            }

            const queryString = params.toString()
            const url = queryString ? `/budgets?${queryString}` : '/budgets'

            const response = await request({ method: 'GET', url })

            // Handle paginated response
            const responseData = response?.data || response

            if (responseData?.data && Array.isArray(responseData.data)) {
                setBudgets(responseData.data)
                setPagination({
                    total: responseData.total || 0,
                    last_page: responseData.last_page || 1,
                    current_page: options.page || responseData.current_page || 1,
                    per_page: responseData.per_page || 15
                })
            } else if (Array.isArray(responseData)) {
                setBudgets(responseData)
                // If array is returned directly, it might not be paginated or it's a simple list
                setPagination({
                    total: responseData.length,
                    last_page: 1,
                    current_page: 1,
                    per_page: responseData.length
                })
            } else {
                setBudgets([])
            }
        } catch (error) {
            console.error('Error fetching budgets:', error)
            toast.error('Error al cargar presupuestos')
        }
    }, [request, options.branchIds, options.status, options.fromDate, options.toDate, options.search, options.page, options.limit])

    const convertToSale = useCallback(async (budgetId: number, receiptTypeId: number, cashRegisterId?: number, paymentMethodId?: number) => {
        setActionLoading(budgetId)
        try {
            const response = await request({
                method: 'POST',
                url: `/budgets/${budgetId}/convert`,
                data: {
                    receipt_type_id: receiptTypeId,
                    cash_register_id: cashRegisterId,
                    payment_method_id: paymentMethodId
                }
            })

            if (response?.success) {
                // No mostrar toast aquí, se muestra en el componente
                await fetchBudgets() // Refrescar lista
                return response.data
            } else {
                throw new Error(response?.message || 'Error al convertir presupuesto')
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error converting budget:', error)

            // Mejorar el manejo de mensajes de error
            let errorMessage = 'Error al convertir presupuesto'

            if (error?.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error?.response?.data?.errors) {
                // Si hay errores de validación, mostrar el primero
                const firstError = Object.values(error.response.data.errors)[0]
                errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
            } else if (error?.message) {
                errorMessage = error.message
            }

            toast.error(errorMessage, { duration: 5000 })
            throw error
        } finally {
            setActionLoading(null)
        }
    }, [request, fetchBudgets])

    const deleteBudget = useCallback(async (budgetId: number) => {
        setActionLoading(budgetId)
        try {
            const response = await request({
                method: 'DELETE',
                url: `/budgets/${budgetId}`
            })

            if (response?.success) {
                toast.success('Presupuesto eliminado exitosamente')
                await fetchBudgets() // Refrescar lista
                return true
            } else {
                throw new Error(response?.message || 'Error al eliminar presupuesto')
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error deleting budget:', error)
            toast.error(error?.message || 'Error al eliminar presupuesto')
            throw error
        } finally {
            setActionLoading(null)
        }
    }, [request, fetchBudgets])

    const approveBudget = useCallback(async (budgetId: number) => {
        setActionLoading(budgetId)
        try {
            const response = await request({
                method: 'PATCH',
                url: `/budgets/${budgetId}/approve`
            })

            if (response?.success) {
                toast.success('Presupuesto aprobado exitosamente')
                await fetchBudgets() // Refrescar lista
                return response.data
            } else {
                throw new Error(response?.message || 'Error al aprobar presupuesto')
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error approving budget:', error)
            toast.error(error?.message || 'Error al aprobar presupuesto')
            throw error
        } finally {
            setActionLoading(null)
        }
    }, [request, fetchBudgets])

    // Ejecutar fetch al montar y cuando cambian los parámetros
    useEffect(() => {
        fetchBudgets()
    }, [fetchBudgets])

    return {
        budgets,
        loading,
        actionLoading,
        fetchBudgets,
        convertToSale,
        approveBudget,
        deleteBudget,
        pagination
    }
}

export type { Budget }
