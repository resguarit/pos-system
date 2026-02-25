import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '@/lib/api'
import type {
    AdvancedStats,
    UserStat,
    CategoryStat,
    SupplierStat,
    HourStat,
    PaymentMethodStat,
    DayOfWeekStat,
    DailyTrend,
    TopProductStat,
    StatisticsFilters,
    StatisticsData,
    SelectOption,
} from '@/types/statistics.types'

/**
 * Custom hook para obtener estadísticas avanzadas de ventas.
 *
 * Encapsula toda la lógica de fetching de los 9 endpoints de estadísticas,
 * maneja loading/error, y expone los datos tipados.
 */
export function useStatistics(filters: StatisticsFilters) {
    const [data, setData] = useState<StatisticsData>({
        stats: null,
        byUser: [],
        byCategory: [],
        bySupplier: [],
        byHour: [],
        byPaymentMethod: [],
        byDayOfWeek: [],
        dailyTrend: [],
        topProducts: [],
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /** Convierte StatisticsFilters a params para axios (elimina valores vacíos) */
    const params = useMemo(() => {
        const p: Record<string, string> = {}
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== 'all') {
                p[key] = value
            }
        })
        return p
    }, [filters])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [
                statsRes,
                byUserRes,
                byCategoryRes,
                bySupplierRes,
                byHourRes,
                byPayMethodRes,
                byDayRes,
                trendRes,
                topRes,
            ] = await Promise.all([
                api.get('/statistics/advanced', { params }),
                api.get('/statistics/by-user', { params }),
                api.get('/statistics/by-category', { params }),
                api.get('/statistics/by-supplier', { params }),
                api.get('/statistics/by-hour', { params }),
                api.get('/statistics/by-payment-method', { params }),
                api.get('/statistics/by-day-of-week', { params }),
                api.get('/statistics/daily-trend', { params }),
                api.get('/statistics/top-products-advanced', { params: { ...params, limit: '50' } }),
            ])

            setData({
                stats: statsRes.data as AdvancedStats,
                byUser: statsRes.data ? (byUserRes.data as UserStat[]) : [],
                byCategory: byCategoryRes.data as CategoryStat[],
                bySupplier: bySupplierRes.data as SupplierStat[],
                byHour: byHourRes.data as HourStat[],
                byPaymentMethod: byPayMethodRes.data as PaymentMethodStat[],
                byDayOfWeek: byDayRes.data as DayOfWeekStat[],
                dailyTrend: trendRes.data as DailyTrend[],
                topProducts: topRes.data as TopProductStat[],
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al cargar las estadísticas'
            setError(message)
            console.error('useStatistics error:', err)
        } finally {
            setLoading(false)
        }
    }, [params])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { ...data, loading, error, refetch: fetchData }
}

/**
 * Custom hook para cargar las opciones de los selectores de filtros.
 * Carga usuarios, categorías y proveedores una sola vez al montar.
 */
export function useStatisticsFilterOptions() {
    const [users, setUsers] = useState<SelectOption[]>([])
    const [categories, setCategories] = useState<SelectOption[]>([])
    const [suppliers, setSuppliers] = useState<SelectOption[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [usersRes, categoriesRes, suppliersRes] = await Promise.all([
                    api.get('/users').catch(() => ({ data: [] })),
                    api.get('/categories').catch(() => ({ data: [] })),
                    api.get('/suppliers').catch(() => ({ data: [] })),
                ])

                const extract = (res: { data: unknown }) =>
                    Array.isArray(res.data) ? res.data : (res.data as { data?: SelectOption[] })?.data || []

                setUsers(extract(usersRes) as SelectOption[])
                setCategories(extract(categoriesRes) as SelectOption[])
                setSuppliers(extract(suppliersRes) as SelectOption[])
            } catch (err) {
                console.error('Error loading filter options:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return { users, categories, suppliers, loading }
}
