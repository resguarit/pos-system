interface LoadingSkeletonProps {
  height?: string
  className?: string
  items?: number
}

export function LoadingSkeleton({ 
  height = "h-[350px]", 
  className = "", 
  items = 8 
}: LoadingSkeletonProps) {
  return (
    <div className={`flex items-center justify-center ${height} ${className}`}>
      <div className="animate-pulse space-y-4 w-full">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
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
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} text-center ${className}`}>
      {icon && (
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm text-gray-500">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}
