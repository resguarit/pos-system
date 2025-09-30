import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSkeleton, EmptyState } from "@/components/ui/loading-states"

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  emptyStateMessage?: string
  emptyStateIcon?: React.ReactNode
  onRowClick?: (item: T) => void
  actions?: (item: T) => React.ReactNode
  maxHeight?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyStateMessage = "No hay datos disponibles",
  emptyStateIcon = "file",
  onRowClick,
  actions,
  maxHeight = "auto"
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <LoadingSkeleton 
        className={`w-full ${maxHeight !== "auto" ? maxHeight : "h-40"}`}
        items={5}
        height="auto"
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState 
        icon={emptyStateIcon}
        title={emptyStateMessage}
        className="py-8"
        height="auto"
      />
    )
  }

  return (
    <div className={`w-full ${maxHeight !== "auto" ? `${maxHeight} overflow-y-auto` : ""}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actions && <TableHead className="w-[100px]">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow
              key={item.id || index}
              className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render ? column.render(item) : item[column.key]}
                </TableCell>
              ))}
              {actions && (
                <TableCell>
                  <div className="flex space-x-2">
                    {actions(item)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Componente específico para listas simples (como ventas recientes)
interface SimpleListProps<T> {
  data: T[]
  isLoading?: boolean
  emptyStateMessage?: string
  emptyStateIcon?: React.ReactNode
  renderItem: (item: T, index: number) => React.ReactNode
  maxHeight?: string
  // Nuevo: cuando se provee, la lista ocupará todo el alto disponible dividiendo el
  // contenedor en esta cantidad de filas iguales.
  fillToCount?: number
  // Clase opcional para el wrapper de cada item cuando se usa fillToCount
  itemClassName?: string
}

export function SimpleList<T>({
  data,
  isLoading = false,
  emptyStateMessage = "No hay datos disponibles",
  emptyStateIcon = "file",
  renderItem,
  maxHeight = "auto",
  fillToCount,
  itemClassName
}: SimpleListProps<T>) {
  if (isLoading) {
    return (
      <LoadingSkeleton 
        className={`w-full ${maxHeight !== "auto" ? maxHeight : "h-40"}`}
        items={5}
        height="auto"
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState 
        icon={emptyStateIcon}
        title={emptyStateMessage}
        className="py-8 flex-1"
        height="auto"
      />
    )
  }

  // Cuando se usa fillToCount, usamos grid con filas iguales para ocupar todo el alto
  if (fillToCount && fillToCount > 0) {
    return (
      <div
        className={`grid gap-3 flex-1 w-full h-full min-h-0 ${maxHeight !== "auto" ? `${maxHeight}` : ""}`}
        style={{ gridTemplateRows: `repeat(${fillToCount}, minmax(0, 1fr))` }}
      >
        {data.slice(0, fillToCount).map((item, index) => (
          <div key={(item as any)?.id ?? index} className={`h-full ${itemClassName ?? ""}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-2 flex-1 w-full h-full min-h-0 overflow-y-auto ${maxHeight !== "auto" ? `${maxHeight}` : ""}`}>
      {data.map((item, index) => renderItem(item, index))}
    </div>
  )
}
