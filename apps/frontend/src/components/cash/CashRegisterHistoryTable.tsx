import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header'
import Pagination from "@/components/ui/pagination"
import { formatCurrency, formatDate } from "@/utils/cash-register-utils"

interface CashRegisterHistoryTableProps {
  registerHistory: any[]
  currentRegister?: any
  optimizedCashRegister?: any
  calculateCashOnlyBalance?: () => number
  // Paginación
  currentPage?: number
  lastPage?: number
  total?: number
  onPageChange?: (page: number) => void
  pageLoading?: boolean
}

export const CashRegisterHistoryTable = ({
  registerHistory,
  currentRegister,
  optimizedCashRegister,
  calculateCashOnlyBalance,
  currentPage,
  lastPage,
  total,
  onPageChange,
  pageLoading = false
}: CashRegisterHistoryTableProps) => {
  // Configuración de columnas redimensionables
  const historyColumnConfig = [
    { id: 'status', minWidth: 80, maxWidth: 140, defaultWidth: 100 },
    { id: 'opening', minWidth: 140, maxWidth: 200, defaultWidth: 170 },
    { id: 'closing', minWidth: 140, maxWidth: 200, defaultWidth: 170 },
    { id: 'initial_amount', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'system_amount', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'counted_cash', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'difference', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'user', minWidth: 100, maxWidth: 180, defaultWidth: 130 },
    { id: 'observations', minWidth: 150, maxWidth: 300, defaultWidth: 200 }
  ]

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: historyColumnConfig,
    storageKey: 'caja-historial-column-widths',
    defaultWidth: 150
  })

  const calculateRegisterData = (register: any) => {
    const openingBalance = parseFloat((register as any).opening_balance || register.initial_amount) || 0
    
    // Obtener el saldo final, manejando null/undefined correctamente
    const finalAmountValue = (register as any).closing_balance ?? (register as any).final_amount ?? null
    const closingBalance = finalAmountValue !== null && finalAmountValue !== undefined
      ? parseFloat(String(finalAmountValue))
      : null
    
    let expectedCashBalance = openingBalance
    let difference: number | null = null
    
    if (currentRegister && register.id === currentRegister.id && optimizedCashRegister) {
      expectedCashBalance = optimizedCashRegister.expected_cash_balance || calculateCashOnlyBalance?.() || 0
      if (optimizedCashRegister.cash_difference !== undefined) {
        difference = optimizedCashRegister.cash_difference
      } else if (closingBalance !== null) {
        difference = closingBalance - expectedCashBalance
      }
    } else {
      expectedCashBalance = (register as any).calculated_expected_cash_balance ?? 
                          (register as any).expected_cash_balance ?? 
                          openingBalance
      
      if ((register as any).calculated_cash_difference !== undefined) {
        difference = (register as any).calculated_cash_difference
      } else if ((register as any).cash_difference !== undefined) {
        difference = (register as any).cash_difference
      } else if (closingBalance !== null) {
        difference = closingBalance - expectedCashBalance
      }
    }
    
    return { 
      openingBalance, 
      closingBalance: closingBalance, 
      expectedCashBalance, 
      difference: difference 
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <ResizableTableHeader
                columnId="status"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Estado
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="opening"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Apertura
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="closing"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Cierre
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="initial_amount"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right"
              >
                Monto Inicial
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="system_amount"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right"
              >
                <span title="Monto que debería haber según movimientos del sistema">
                  Sistema
                </span>
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="counted_cash"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right"
              >
                Efectivo Contado
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="difference"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right hidden md:table-cell"
              >
                <span title="Diferencia entre efectivo contado y lo que debería haber según movimientos del sistema">
                  Diferencia
                </span>
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="user"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell"
              >
                Usuario
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="observations"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden lg:table-cell"
              >
                Observaciones
              </ResizableTableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registerHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <span className="text-muted-foreground">No se encontraron registros de caja</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {registerHistory.map((register) => {
              const { openingBalance, closingBalance, expectedCashBalance, difference } = calculateRegisterData(register)
              
              return (
                <TableRow key={register.id}>
                  <ResizableTableCell
                    columnId="status"
                    getColumnCellProps={getColumnCellProps}
                  >
                    <Badge className={register.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="opening"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden md:table-cell"
                  >
                    <span className="truncate" title={formatDate(register.opened_at)}>
                      {formatDate(register.opened_at)}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="closing"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden md:table-cell"
                  >
                    <span className="truncate" title={register.closed_at ? formatDate(register.closed_at as string) : '-'}>
                      {register.closed_at ? formatDate(register.closed_at as string) : '-'}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="initial_amount"
                    getColumnCellProps={getColumnCellProps}
                    className="text-right"
                  >
                    <span className="truncate" title={formatCurrency(openingBalance)}>
                      {formatCurrency(openingBalance)}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="system_amount"
                    getColumnCellProps={getColumnCellProps}
                    className="text-right font-medium text-blue-600"
                  >
                    <span className="truncate" title={formatCurrency(expectedCashBalance)}>
                      {formatCurrency(expectedCashBalance)}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="counted_cash"
                    getColumnCellProps={getColumnCellProps}
                    className="text-right"
                  >
                    <span className="truncate" title={closingBalance !== null ? formatCurrency(closingBalance) : '-'}>
                      {closingBalance !== null ? formatCurrency(closingBalance) : '-'}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="difference"
                    getColumnCellProps={getColumnCellProps}
                    className={`text-right hidden md:table-cell font-semibold ${
                      difference === null
                        ? "text-gray-500"
                        : Math.abs(difference) < 0.01
                          ? "text-blue-600"
                          : difference > 0
                            ? "text-green-600"
                            : "text-red-600"
                    }`}
                  >
                    <span className="truncate" title={difference !== null ? formatCurrency(difference) : '-'}>
                      {difference === null 
                        ? '-' 
                        : Math.abs(difference) < 0.01
                          ? 'Sin diferencia'
                          : difference > 0
                            ? `+${formatCurrency(difference)} (sobrante)`
                            : `${formatCurrency(difference)} (faltante)`
                      }
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="user"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden md:table-cell"
                  >
                    <span className="truncate" title={(register as any)?.user?.username || (register as any)?.user?.email || 'N/A'}>
                      {(register as any)?.user?.username || (register as any)?.user?.email || 'N/A'}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="observations"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden lg:table-cell"
                  >
                    <span className="truncate" title={(register as any)?.closing_notes || (register as any)?.notes || ''}>
                      {(register as any)?.closing_notes || (register as any)?.notes || 
                       (register.status === 'open' ? '-' : 'Sin observaciones')}
                    </span>
                  </ResizableTableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {registerHistory.length > 0 && currentPage && lastPage && total && onPageChange && (
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          itemName="registros de caja"
          onPageChange={onPageChange}
          disabled={pageLoading}
        />
      )}
    </div>
  )
}
