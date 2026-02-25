/**
 * Utilidades y constantes compartidas para el módulo de estadísticas.
 */

/** Nombres de días de la semana (MySQL DAYOFWEEK: 1=Domingo, 7=Sábado) */
export const DAY_NAMES = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
] as const

/** Paleta de colores para gráficos */
export const CHART_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
] as const

/** Array 0-23 para los selectores de hora */
export const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** Formateo de moneda ARS */
export const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

/** Formateo numérico con separadores locales */
export const formatNumber = (n: number): string =>
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n)

/** Formateo corto para ejes Y de gráficos (e.g. $1.5K, $2.3M) */
export const formatAxisCurrency = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value}`
}

/** Obtiene el nombre del día desde el índice MySQL DAYOFWEEK */
export const getDayName = (dayOfWeek: number): string =>
    DAY_NAMES[dayOfWeek - 1] || `Día ${dayOfWeek}`

/** Formatea hora como "HH:00 - HH:59" */
export const formatHourRange = (hour: number): string =>
    `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`

/** Calcula el porcentaje con respecto a un total */
export const percentOf = (value: number, total: number): string =>
    total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '—'
