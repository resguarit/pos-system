import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function ActionButton({ 
  children, 
  onClick, 
  variant = "default", 
  size = "default",
  disabled = false,
  loading = false,
  className = ""
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(className)}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Cargando...
        </>
      ) : (
        children
      )}
    </Button>
  )
}

interface StatusBadgeProps {
  status: 'out_of_stock' | 'low_stock' | 'in_stock' | 'active' | 'inactive'
  customText?: string
  className?: string
}

export function StatusBadge({ status, customText, className = "" }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'out_of_stock':
        return {
          text: customText || 'Sin Stock',
          className: 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
        }
      case 'low_stock':
        return {
          text: customText || 'Stock Bajo',
          className: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
        }
      case 'in_stock':
        return {
          text: customText || 'En Stock',
          className: 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
        }
      case 'active':
        return {
          text: customText || 'Activo',
          className: 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
        }
      case 'inactive':
        return {
          text: customText || 'Inactivo',
          className: 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700'
        }
      default:
        return {
          text: customText || status,
          className: 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge className={cn(config.className, className)}>
      {config.text}
    </Badge>
  )
}

interface StatusDotProps {
  status: 'out_of_stock' | 'low_stock' | 'in_stock' | 'active' | 'inactive'
  className?: string
}

export function StatusDot({ status, className = "" }: StatusDotProps) {
  const getColorClass = () => {
    switch (status) {
      case 'out_of_stock':
        return 'bg-red-500'
      case 'low_stock':
        return 'bg-yellow-500'
      case 'in_stock':
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={cn("w-2 h-2 rounded-full mr-2", getColorClass(), className)} />
  )
}
