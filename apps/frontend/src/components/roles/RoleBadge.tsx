/**
 * @fileoverview Componente reutilizable para mostrar badges de roles con estilos consistentes.
 * 
 * @module components/roles/RoleBadge
 */

import { Badge } from "@/components/ui/badge"
import { getRoleStyle } from "@/types/roles-styles"
import { cn } from "@/lib/utils"
import type { HTMLAttributes } from "react"

export interface RoleBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Nombre del rol a mostrar */
  roleName?: string | null
  /** Texto alternativo a mostrar (por defecto usa roleName) */
  displayText?: string
  /** Tamaño del icono en el badge */
  iconSize?: string
  /** Si es true, muestra el icono */
  showIcon?: boolean
  /** Clases CSS adicionales */
  className?: string
  /** Variante del badge (por defecto usa los colores del rol) */
  variant?: "default" | "outline" | "secondary" | "destructive"
}

/**
 * Componente reutilizable para mostrar un badge de rol con icono y colores consistentes.
 * 
 * Este componente encapsula la lógica de obtener estilos y renderizar el badge,
 * siguiendo el principio DRY (Don't Repeat Yourself).
 * 
 * @param props - Propiedades del componente
 * @returns Un componente Badge con el estilo del rol
 * 
 * @example
 * ```tsx
 * // Uso básico
 * <RoleBadge roleName="Administrador" />
 * 
 * // Con texto personalizado
 * <RoleBadge roleName="Vendedor" displayText="Vendedor Principal" />
 * 
 * // Sin icono
 * <RoleBadge roleName="Supervisor" showIcon={false} />
 * 
 * // Con clases adicionales
 * <RoleBadge roleName="Gerente" className="hover:bg-opacity-90 truncate" />
 * ```
 */
export function RoleBadge({
  roleName,
  displayText,
  iconSize = "h-3 w-3",
  showIcon = true,
  className,
  variant,
  ...props
}: RoleBadgeProps) {
  const roleStyle = getRoleStyle(roleName)
  const RoleIcon = roleStyle.icon
  const displayName = displayText || roleName || "Sin rol"

  // Aplicar los colores del rol a menos que se especifique una variante explícita
  const badgeClassName = variant === undefined
    ? cn(roleStyle.badgeColor, className)
    : className

  return (
    <Badge 
      className={badgeClassName}
      variant={variant}
      {...props}
    >
      {showIcon && (
        <RoleIcon className={cn("mr-1", iconSize)} aria-hidden="true" />
      )}
      <span>{displayName}</span>
    </Badge>
  )
}

