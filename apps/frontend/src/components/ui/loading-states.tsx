import { Skeleton, TableSkeleton, TableSkeletonBodyRows } from "@/components/ui/skeleton"

/**
 * Patrones de carga: usar `Skeleton` / `TableSkeleton` / `TableSkeletonBodyRows` / `LoadingSkeleton`
 * para bloques de contenido (tablas, grillas, cards). Mantener spinners en botones y acciones breves
 * (guardar, refrescar icon, descargar).
 */
export type { TableSkeletonProps, TableSkeletonBodyRowsProps } from "@/components/ui/skeleton"
export { Skeleton, TableSkeleton, TableSkeletonBodyRows }

interface LoadingSkeletonProps {
  height?: string
  className?: string
  items?: number
}

export function LoadingSkeleton({
  height = "h-[350px]",
  className = "",
  items = 8,
}: LoadingSkeletonProps) {
  return (
    <div className={`flex items-center justify-center ${height} ${className}`}>
      <div className="space-y-4 w-full">
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-2">
          {Array.from({ length: items }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  height?: string
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  height = "h-[350px]",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${height} text-center ${className}`}
    >
      {icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
