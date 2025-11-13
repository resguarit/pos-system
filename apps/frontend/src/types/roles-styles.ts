/**
 * @fileoverview Sistema centralizado de estilos para roles de usuario.
 * Proporciona iconos y colores consistentes para todos los roles en la aplicación.
 * 
 * @module types/roles-styles
 */

import { Shield, User, ShoppingCart, UserCog, Wallet, Package, Calculator } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Nombres de roles normalizados utilizados en el sistema.
 * Estos valores deben coincidir con los nombres de roles en la base de datos.
 */
export const ROLE_NAMES = {
  ADMIN: 'admin',
  ADMINISTRADOR: 'administrador',
  VENDEDOR: 'vendedor',
  GERENTE: 'gerente',
  SUPERVISOR: 'supervisor',
  CAJERO: 'cajero',
  DEPOSITO: 'deposito',
  CONTADOR: 'contador',
} as const

/**
 * Tipo que representa los nombres de roles válidos.
 */
export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES] | string

/**
 * Configuración de estilo para un rol específico.
 */
export interface RoleStyle {
  /** Componente de icono de Lucide React */
  icon: LucideIcon
  /** Clase de color para texto simple (text-*) */
  textColor: string
  /** Clase de color para badges (bg-* text-* border-*) */
  badgeColor: string
  /** @deprecated Usar textColor en su lugar. Mantenido para compatibilidad hacia atrás. */
  color: string
}

/**
 * Configuración de estilos para cada rol.
 * Este objeto centraliza toda la configuración de estilos.
 */
const ROLE_STYLES_CONFIG: Record<string, Omit<RoleStyle, 'color'>> = {
  [ROLE_NAMES.ADMIN]: {
    icon: Shield,
    textColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
  },
  [ROLE_NAMES.ADMINISTRADOR]: {
    icon: Shield,
    textColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
  },
  [ROLE_NAMES.VENDEDOR]: {
    icon: ShoppingCart,
    textColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  [ROLE_NAMES.GERENTE]: {
    icon: UserCog,
    textColor: 'text-green-500',
    badgeColor: 'bg-green-100 text-green-800 border-green-300',
  },
  [ROLE_NAMES.SUPERVISOR]: {
    icon: UserCog,
    textColor: 'text-purple-500',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  [ROLE_NAMES.CAJERO]: {
    icon: Wallet,
    textColor: 'text-orange-500',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  [ROLE_NAMES.DEPOSITO]: {
    icon: Package,
    textColor: 'text-cyan-500',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  [ROLE_NAMES.CONTADOR]: {
    icon: Calculator,
    textColor: 'text-indigo-500',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
} as const

/**
 * Estilo por defecto para roles no reconocidos.
 */
const DEFAULT_ROLE_STYLE: Omit<RoleStyle, 'color'> = {
  icon: User,
  textColor: 'text-gray-500',
  badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
} as const

/**
 * Mapeo de variaciones de nombres de roles a nombres normalizados.
 * Permite manejar diferentes formas de escribir el mismo rol.
 */
const ROLE_NAME_VARIATIONS: Record<string, string> = {
  'admin': ROLE_NAMES.ADMIN,
  'administrador': ROLE_NAMES.ADMIN,
  'administrator': ROLE_NAMES.ADMIN,
} as const

/**
 * Normaliza el nombre del rol para manejar variaciones y casos especiales.
 * 
 * @param roleName - El nombre del rol a normalizar (puede ser undefined, null o string)
 * @returns El nombre del rol normalizado en minúsculas y sin espacios
 * 
 * @example
 * normalizeRoleName('Administrador') // 'administrador'
 * normalizeRoleName('ADMIN') // 'admin'
 * normalizeRoleName(undefined) // ''
 */
function normalizeRoleName(roleName?: string | null): string {
  if (!roleName || typeof roleName !== 'string') {
    return ''
  }

  const normalized = roleName.toLowerCase().trim()
  
  // Verificar si hay una variación conocida
  return ROLE_NAME_VARIATIONS[normalized] || normalized
}

/**
 * Obtiene la configuración de estilo para un rol específico.
 * 
 * Esta función es pura y determinística: siempre retorna el mismo resultado
 * para el mismo input, lo que facilita el testing y el caching.
 * 
 * @param roleName - El nombre del rol (ej. "Admin", "Administrador", "Vendedor")
 * @returns Un objeto con el icono y las clases de color para el rol
 * 
 * @example
 * ```tsx
 * const style = getRoleStyle('Administrador')
 * const Icon = style.icon
 * 
 * return (
 *   <Badge className={style.badgeColor}>
 *     <Icon className="h-4 w-4" />
 *     Administrador
 *   </Badge>
 * )
 * ```
 */
export function getRoleStyle(roleName?: string | null): RoleStyle {
  const normalizedRole = normalizeRoleName(roleName)
  
  // Buscar el estilo configurado o usar el por defecto
  const styleConfig = ROLE_STYLES_CONFIG[normalizedRole] || DEFAULT_ROLE_STYLE
  
  // Retornar el objeto completo con compatibilidad hacia atrás
  return {
    ...styleConfig,
    color: styleConfig.textColor, // Mantener compatibilidad hacia atrás
  }
}

/**
 * Verifica si un nombre de rol tiene un estilo personalizado configurado.
 * 
 * @param roleName - El nombre del rol a verificar
 * @returns true si el rol tiene un estilo personalizado, false si usará el estilo por defecto
 */
export function hasCustomRoleStyle(roleName?: string | null): boolean {
  const normalizedRole = normalizeRoleName(roleName)
  return normalizedRole !== '' && normalizedRole in ROLE_STYLES_CONFIG
}