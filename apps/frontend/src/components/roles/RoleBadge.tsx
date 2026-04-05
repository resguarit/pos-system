/**
 * @fileoverview Badge de rol con color por nombre o hex guardado en API (#RRGGBB).
 */

import { Badge } from "@/components/ui/badge"
import { getRoleBadgeDisplay } from "@/types/roles-styles"
import { cn } from "@/lib/utils"
import type { HTMLAttributes } from "react"

export interface RoleBadgeProps extends HTMLAttributes<HTMLDivElement> {
  roleName?: string | null
  /** Color #RRGGBB desde API (columna roles.color) */
  roleColor?: string | null
  displayText?: string
  iconSize?: string
  showIcon?: boolean
  className?: string
  variant?: "default" | "outline" | "secondary" | "destructive"
}

export function RoleBadge({
  roleName,
  roleColor,
  displayText,
  iconSize = "h-3 w-3",
  showIcon = true,
  className,
  variant,
  ...props
}: RoleBadgeProps) {
  const display = getRoleBadgeDisplay(roleName, roleColor)
  const RoleIcon = display.icon
  const displayName = displayText || roleName || "Sin rol"

  if (display.useCustomColor && display.custom) {
    const { color, borderColor, backgroundColor } = display.custom
    return (
      <Badge
        variant="outline"
        className={cn("gap-0.5 font-normal", className)}
        style={{
          color,
          borderColor,
          backgroundColor,
        }}
        {...props}
      >
        {showIcon && (
          <RoleIcon className={cn("mr-0.5 shrink-0", iconSize)} style={{ color }} aria-hidden="true" />
        )}
        <span>{displayName}</span>
      </Badge>
    )
  }

  const badgeClassName =
    variant === undefined ? cn(display.twBadge, className) : className

  return (
    <Badge className={cn(badgeClassName, "gap-0.5")} variant={variant} {...props}>
      {showIcon && <RoleIcon className={cn("mr-0.5 shrink-0", iconSize)} aria-hidden="true" />}
      <span>{displayName}</span>
    </Badge>
  )
}
