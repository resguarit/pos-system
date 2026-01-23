/**
 * Utilidad centralizada para manejar ciclos de facturación/plazos
 * Siguiendo el principio DRY (Don't Repeat Yourself) y Single Responsibility
 * 
 * Este archivo centraliza:
 * - Etiquetas de ciclos de facturación
 * - Estilos de badges para ciclos
 * - Funciones helper para obtener estilos y etiquetas consistentes
 */

/**
 * Tipos de ciclos de facturación disponibles
 */
export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'yearly' | 'one_time';

/**
 * Configuración de ciclos de facturación
 * Define etiquetas y estilos de forma consistente
 */
interface BillingCycleConfig {
    label: string;
    shortLabel?: string;
    badgeStyles: string;
    order: number; // Para ordenar de menor a mayor frecuencia
}

/**
 * Mapeo centralizado de ciclos de facturación
 * Principio: Single Source of Truth
 * 
 * Colores asignados:
 * - Diario: Azul (alta frecuencia)
 * - Semanal: Índigo
 * - Mensual: Púrpura (más común)
 * - Trimestral: Violeta
 * - Anual/Yearly: Rosa (baja frecuencia)
 * - Único: Gris (sin recurrencia)
 */
const BILLING_CYCLE_CONFIG: Record<BillingCycle, BillingCycleConfig> = {
    daily: {
        label: 'Diario',
        shortLabel: 'Diario',
        badgeStyles: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200',
        order: 1,
    },
    weekly: {
        label: 'Semanal',
        shortLabel: 'Semanal',
        badgeStyles: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200',
        order: 2,
    },
    monthly: {
        label: 'Mensual',
        shortLabel: 'Mensual',
        badgeStyles: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200',
        order: 3,
    },
    quarterly: {
        label: 'Trimestral',
        shortLabel: 'Trimestral',
        badgeStyles: 'bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200',
        order: 4,
    },
    annual: {
        label: 'Anual',
        shortLabel: 'Anual',
        badgeStyles: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200',
        order: 5,
    },
    yearly: {
        label: 'Anual',
        shortLabel: 'Anual',
        badgeStyles: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200',
        order: 5,
    },
    one_time: {
        label: 'Único',
        shortLabel: 'Único',
        badgeStyles: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200',
        order: 6,
    },
};

/**
 * Obtiene la etiqueta de un ciclo de facturación
 * @param cycle - El ciclo de facturación
 * @param short - Si se debe usar la versión corta de la etiqueta
 * @returns La etiqueta del ciclo
 */
export function getBillingCycleLabel(cycle: string, short: boolean = false): string {
    const config = BILLING_CYCLE_CONFIG[cycle as BillingCycle];
    if (!config) return cycle;
    
    return short && config.shortLabel ? config.shortLabel : config.label;
}

/**
 * Obtiene los estilos CSS para el badge de un ciclo de facturación
 * @param cycle - El ciclo de facturación
 * @returns String con las clases CSS de Tailwind
 */
export function getBillingCycleBadgeStyles(cycle: string): string {
    const config = BILLING_CYCLE_CONFIG[cycle as BillingCycle];
    return config?.badgeStyles || BILLING_CYCLE_CONFIG.monthly.badgeStyles;
}

/**
 * Obtiene toda la configuración de un ciclo de facturación
 * @param cycle - El ciclo de facturación
 * @returns Objeto con label y estilos
 */
export function getBillingCycleConfig(cycle: string): { label: string; styles: string } {
    return {
        label: getBillingCycleLabel(cycle),
        styles: getBillingCycleBadgeStyles(cycle),
    };
}

/**
 * Valida si un string es un ciclo de facturación válido
 * @param cycle - String a validar
 * @returns true si es válido
 */
export function isValidBillingCycle(cycle: string): cycle is BillingCycle {
    return cycle in BILLING_CYCLE_CONFIG;
}

/**
 * Obtiene todos los ciclos de facturación disponibles
 * @returns Array de objetos con id, label y styles
 */
export function getAllBillingCycles(): Array<{ id: BillingCycle; label: string; styles: string; order: number }> {
    return Object.entries(BILLING_CYCLE_CONFIG).map(([id, config]) => ({
        id: id as BillingCycle,
        label: config.label,
        styles: config.badgeStyles,
        order: config.order,
    }));
}

/**
 * Mapeo de etiquetas a valores de ciclo
 * Útil para conversión inversa
 */
export const BILLING_CYCLE_VALUES: Record<string, BillingCycle> = {
    'Diario': 'daily',
    'Semanal': 'weekly',
    'Mensual': 'monthly',
    'Trimestral': 'quarterly',
    'Anual': 'annual',
    'Único': 'one_time',
};
