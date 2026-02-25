/**
 * Tipos de datos para el módulo de estadísticas de ventas.
 */

export interface AdvancedStats {
    total_sales: number
    total_units: number
    total_revenue: number
    average_ticket: number
}

export interface UserStat {
    user_id: number
    user_name: string
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface CategoryStat {
    category_id: number | null
    category_name: string
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface SupplierStat {
    supplier_id: number | null
    supplier_name: string
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface HourStat {
    hour: number
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface PaymentMethodStat {
    payment_method_id: number
    payment_method_name: string
    total_sales: number
    total_revenue: number
}

export interface DayOfWeekStat {
    day_of_week: number
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface DailyTrend {
    date: string
    total_sales: number
    total_units: number
    total_revenue: number
}

export interface TopProductStat {
    product_id: number
    product_code: string
    product_name: string
    category_name: string
    supplier_name: string
    total_units: number
    total_revenue: number
    total_sales: number
}

/** Parámetros de filtro que se envían al backend */
export interface StatisticsFilters {
    start_date?: string
    end_date?: string
    branch_id?: string
    user_id?: string
    category_id?: string
    supplier_id?: string
    product_search?: string
    hour_from?: string
    hour_to?: string
}

/** Datos completos retornados por useStatistics */
export interface StatisticsData {
    stats: AdvancedStats | null
    byUser: UserStat[]
    byCategory: CategoryStat[]
    bySupplier: SupplierStat[]
    byHour: HourStat[]
    byPaymentMethod: PaymentMethodStat[]
    byDayOfWeek: DayOfWeekStat[]
    dailyTrend: DailyTrend[]
    topProducts: TopProductStat[]
}

/** Opción genérica para los selectores */
export interface SelectOption {
    id: number
    name?: string
    description?: string
}
