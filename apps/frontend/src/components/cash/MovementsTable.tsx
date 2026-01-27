import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BranchBadge } from "@/components/BranchBadge"
import { getBranchColor } from "@/utils/branchColor"
import { Eye, Trash2, FileText } from "lucide-react"
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizableTableHeader } from '@/components/ui/resizable-table-header'
import Pagination from "@/components/ui/pagination"
import {
  formatCurrency,
  formatDate,
  getPaymentMethod,
  cleanMovementDescription,
  isIncomeMovement,
  isSaleReference,
  isPurchaseOrderReference
} from "@/utils/cash-register-utils"

interface MovementsTableProps {
  movements: any[]
  loading?: boolean
  canDeleteMovements?: boolean
  onViewSale?: (movement: any) => void
  onViewPurchaseOrder?: (movement: any) => void
  onDeleteMovement?: (movementId: number) => void
  isCashPaymentMethod?: (name: string) => boolean
  getBranchInfo?: (branchId: number) => any
  showBranchColumn?: boolean
  // Paginación
  currentPage?: number
  lastPage?: number
  total?: number
  onPageChange?: (page: number) => void
  pageLoading?: boolean
}

export const MovementsTable = ({
  movements,
  loading = false,
  canDeleteMovements = false,
  onViewSale,
  onViewPurchaseOrder,
  onDeleteMovement,
  isCashPaymentMethod,
  getBranchInfo,
  showBranchColumn = false,
  currentPage,
  lastPage,
  total,
  onPageChange,
  pageLoading = false
}: MovementsTableProps) => {
  // Configuración de columnas redimensionables
  const movementsColumnConfig = [
    { id: 'type', minWidth: 80, maxWidth: 150, defaultWidth: 100 },
    { id: 'description', minWidth: 150, maxWidth: 400, defaultWidth: 250 },
    { id: 'method', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'date', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'amount', minWidth: 100, maxWidth: 180, defaultWidth: 130 },
    ...(showBranchColumn ? [{ id: 'branch', minWidth: 120, maxWidth: 200, defaultWidth: 150 }] : []),
    { id: 'user', minWidth: 100, maxWidth: 200, defaultWidth: 150 },
    ...(canDeleteMovements ? [{ id: 'actions', minWidth: 80, maxWidth: 120, defaultWidth: 100 }] : [])
  ]

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    tableRef
  } = useResizableColumns({
    columns: movementsColumnConfig,
    storageKey: 'caja-movimientos-column-widths',
    defaultWidth: 150
  })

  const getPaymentMethodForMovement = (movement: any) => {
    return getPaymentMethod(movement, isCashPaymentMethod)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-md">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              <span className="text-sm font-medium">Cargando movimientos...</span>
            </div>
          </div>
        )}

        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <ResizableTableHeader
                columnId="type"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Tipo
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="description"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Descripción
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="method"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Método
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="date"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Fecha
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="amount"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right"
              >
                Monto
              </ResizableTableHeader>
              {showBranchColumn && (
                <ResizableTableHeader
                  columnId="branch"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  Sucursal
                </ResizableTableHeader>
              )}
              <ResizableTableHeader
                columnId="user"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Usuario
              </ResizableTableHeader>
              {canDeleteMovements && (
                <ResizableTableHeader
                  columnId="actions"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="text-center"
                >
                  Acciones
                </ResizableTableHeader>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={movementsColumnConfig.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <span className="text-muted-foreground">No se encontraron movimientos</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => {
                const amount = parseFloat(movement.amount) || 0
                const isIncome = isIncomeMovement(movement)
                const userLabel = movement.user?.name || movement.user?.full_name || movement.user?.username || movement.user?.email || 'N/A'
                const cleanedDescription = cleanMovementDescription(movement.description)
                const typeLabel = movement.movement_type?.description || movement.movement_type?.name || 'N/A'
                const affectsBalance = movement.affects_balance !== false
                const isSaleRef = isSaleReference(movement)
                const isPurchaseOrderRef = isPurchaseOrderReference(movement)

                return (
                  <TableRow
                    key={movement.id}
                    className={!affectsBalance ? 'bg-gray-100 opacity-75' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isIncome
                              ? "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                              : "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700"
                          }
                        >
                          {typeLabel}
                        </Badge>
                        {!affectsBalance && (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-600 text-xs"
                            title="Este movimiento NO afecta el balance de la caja"
                          >
                            Informativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cleanedDescription}</TableCell>
                    <TableCell className="hidden md:table-cell">{getPaymentMethodForMovement(movement)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(movement.created_at)}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={isIncome ? 'text-green-600' : 'text-red-600'}>
                        {isIncome ? '+' : '-'} {formatCurrency(Math.abs(amount))}
                      </span>
                    </TableCell>
                    {showBranchColumn && (
                      <TableCell className="hidden md:table-cell">
                        {(() => {
                          const branchInfo = getBranchInfo?.(movement.branch_id)
                          const branchColor = getBranchColor({ branchColor: branchInfo?.color })
                          const branchName = branchInfo?.description ?? movement.branch_name ?? `Sucursal ${movement.branch_id}`

                          return (
                            <BranchBadge
                              name={branchName}
                              color={branchColor}
                            />
                          )
                        })()}
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      {userLabel}
                    </TableCell>
                    {canDeleteMovements && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isSaleRef && onViewSale && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewSale(movement)}
                              title="Ver detalle de venta"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {isPurchaseOrderRef && onViewPurchaseOrder && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewPurchaseOrder(movement)}
                              title="Ver orden de compra"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onDeleteMovement && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteMovement(movement.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar movimiento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {currentPage && lastPage && onPageChange && (
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          total={total ?? movements.length}
          itemName="movimientos"
          onPageChange={onPageChange}
          disabled={pageLoading}
        />
      )}
    </div>
  )
}
