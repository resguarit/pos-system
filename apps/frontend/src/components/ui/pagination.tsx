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
  // Usar valores seguros para evitar problemas con valores nulos o undefined
  const safeCurrentPage = currentPage ?? 1
  const safeLastPage = lastPage ?? 1
  const safeTotal = total ?? 0

  // Solo ocultar si realmente no hay datos y estamos en la página inicial
  if (safeTotal === 0 && safeCurrentPage === 1 && safeLastPage === 1) {
    return null
  }

  return (
    <div className={cn("flex items-center justify-between space-x-2 py-4", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
        disabled={disabled || safeCurrentPage <= 1}
      >
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {safeCurrentPage} de {safeLastPage} ({safeTotal} {itemName})
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(safeLastPage, safeCurrentPage + 1))}
        disabled={disabled || safeCurrentPage >= safeLastPage}
      >
        Siguiente
        <ChevronRightIcon className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}
