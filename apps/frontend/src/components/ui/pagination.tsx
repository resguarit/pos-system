import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  itemName?: string // e.g., "movimientos", "productos", "clientes"
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export default function Pagination({
  currentPage,
  lastPage,
  total,
  itemName = "elementos",
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  
  // Temporalmente mostrar siempre si hay al menos 1 elemento para probar
  if (total === 0) {
    return null
  }

  return (
    <div className={cn("flex items-center justify-between space-x-2 py-4", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage === 1}
      >
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {currentPage} de {lastPage} ({total} {itemName})
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
        disabled={disabled || currentPage === lastPage}
      >
        Siguiente
        <ChevronRightIcon className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}
