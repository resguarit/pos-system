import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export interface TableSkeletonProps {
  /** Número de columnas de datos (sin contar acciones). */
  columns: number
  rows?: number
  /** Si true, primera fila simula cabeceras. */
  showHeader?: boolean
  /** Columna extra estrecha para iconos/botones. */
  hasActionsColumn?: boolean
  className?: string
  /** Clases opcionales por columna de datos (ej. `max-w-[40%]`). */
  columnClassNames?: string[]
}

/**
 * Placeholder de tabla alineado con @/components/ui/table.
 * Usar dentro del mismo contenedor que la tabla real (mismo colSpan visual).
 */
function TableSkeleton({
  columns,
  rows = 5,
  showHeader = false,
  hasActionsColumn = false,
  className,
  columnClassNames,
}: TableSkeletonProps) {
  const dataCols = Math.max(1, columns)
  const actionCol = hasActionsColumn ? 1 : 0

  return (
    <div
      className={cn("w-full", className)}
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: dataCols }).map((_, i) => (
                <TableHead key={`h-${i}`} className={columnClassNames?.[i]}>
                  <Skeleton className="h-4 w-3/5 max-w-[120px]" />
                </TableHead>
              ))}
              {actionCol > 0 && (
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-12" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, ri) => (
            <TableRow key={`r-${ri}`}>
              {Array.from({ length: dataCols }).map((_, ci) => (
                <TableCell key={`c-${ri}-${ci}`} className={columnClassNames?.[ci]}>
                  <Skeleton
                    className={cn(
                      "h-4 w-full",
                      ci % 3 === 1 && "max-w-[85%]",
                      ci % 3 === 2 && "max-w-[60%]"
                    )}
                  />
                </TableCell>
              ))}
              {actionCol > 0 && (
                <TableCell>
                  <Skeleton className="h-8 w-20 ml-auto rounded-md" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export interface TableSkeletonBodyRowsProps {
  /** Número de celdas por fila (debe coincidir con las columnas de la tabla). */
  columns: number
  rows?: number
}

/**
 * Solo filas `<TableRow>` para usar dentro de `<TableBody>` cuando la cabecera ya está renderizada.
 */
export function TableSkeletonBodyRows({ columns, rows = 6 }: TableSkeletonBodyRowsProps) {
  const n = Math.max(1, columns)
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <TableRow key={`sk-${ri}`}>
          {Array.from({ length: n }).map((_, ci) => (
            <TableCell key={`sk-${ri}-${ci}`}>
              <Skeleton
                className={cn(
                  "h-4",
                  ci === n - 1 ? "w-20 ml-auto" : "w-full max-w-[min(100%,14rem)]"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export { Skeleton, TableSkeleton }
