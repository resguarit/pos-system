import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { usePermissions } from '@/hooks/usePermissions'
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header'
import { Badge } from "@/components/ui/badge"
import { BranchBadge } from "@/components/BranchBadge"
import { getBranchColor } from "@/utils/branchColor"
import { Plus, Search, ArrowRightLeft, CheckCircle, XCircle, Pencil, Eye, Clock, FileText, FileSpreadsheet, MoreHorizontal } from "lucide-react"

// Permission constants for type safety
const PERMISSIONS = {
  VIEW: 'ver_transferencias',
  CREATE: 'crear_transferencias',
  EDIT: 'editar_transferencias',
  COMPLETE: 'completar_transferencias',
  CANCEL: 'cancelar_transferencias',
} as const;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Option } from "@/components/ui/multi-select"
import { NewStockTransferDialog, StockTransferDialog } from "@/components/stock-transfers/new-stock-transfer-dialog"
import { ViewStockTransferDialog } from "@/components/stock-transfers/view-stock-transfer-dialog"
import { stockTransferService } from '@/lib/api/stockTransferService'
import type { StockTransfer } from '@/types/stockTransfer'
import { toast } from "sonner"
import { useBranch } from '@/context/BranchContext'
import { exportTransferToPDF, exportTransferToExcel } from '@/lib/utils/transferExport'
import { DatePickerWithRange, DateRange } from "@/components/ui/date-range-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default function StockTransfersPage() {
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [branchFilterUI, setBranchFilterUI] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Permission checks
  const canCreate = hasPermission(PERMISSIONS.CREATE)
  const canEdit = hasPermission(PERMISSIONS.EDIT)
  const canComplete = hasPermission(PERMISSIONS.COMPLETE)
  const canCancel = hasPermission(PERMISSIONS.CANCEL)

  const columnConfig = [
    { id: 'number', minWidth: 60, maxWidth: 120, defaultWidth: 80 },
    { id: 'date', minWidth: 100, maxWidth: 180, defaultWidth: 120 },
    { id: 'source', minWidth: 120, maxWidth: 250, defaultWidth: 180 },
    { id: 'destination', minWidth: 120, maxWidth: 250, defaultWidth: 180 },
    { id: 'items', minWidth: 60, maxWidth: 120, defaultWidth: 80 },
    { id: 'user', minWidth: 140, maxWidth: 220, defaultWidth: 170 },
    { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'actions', minWidth: 200, maxWidth: 300, defaultWidth: 240 }
  ]

  const { getResizeHandleProps, getColumnHeaderProps, getColumnCellProps, tableRef } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'stock-transfers-column-widths',
    defaultWidth: 150
  })

  const [openNewTransfer, setOpenNewTransfer] = useState(false)
  const [editTransferId, setEditTransferId] = useState<number | null>(null)
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [transferToComplete, setTransferToComplete] = useState<number | null>(null)
  const [transferToCancel, setTransferToCancel] = useState<number | null>(null)
  const [transferToDelete, setTransferToDelete] = useState<number | null>(null)
  const [viewTransferId, setViewTransferId] = useState<number | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const { selectedBranchIds } = useBranch()

  useEffect(() => { loadTransfers() }, [])

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const data = await stockTransferService.getAll()
      setTransfers(data)
    } catch (error) {
      console.error('Error loading stock transfers:', error)
      toast.error("Error al cargar transferencias")
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }

  const handleTransferSaved = async () => {
    setOpenNewTransfer(false)
    await loadTransfers()
  }

  const handleCompleteTransfer = async (id: number) => {
    try {
      await stockTransferService.complete(id)
      toast.success("Transferencia completada exitosamente")
      setTransferToComplete(null)
      await loadTransfers()
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Error al completar")
    }
  }

  const handleCancelTransfer = async (id: number) => {
    try {
      await stockTransferService.cancel(id)
      toast.success("Transferencia cancelada")
      setTransferToCancel(null)
      await loadTransfers()
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Error al cancelar")
    }
  }

  const handleDeleteTransfer = async (id: number) => {
    try {
      await stockTransferService.delete(id)
      toast.success("Transferencia eliminada")
      setTransferToDelete(null)
      await loadTransfers()
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Error al eliminar")
    }
  }

  const isPending = (status?: string) => (status ?? '').toLowerCase() === 'pending'

  const getStatusBadgeColor = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    switch (s) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50'
      case 'completed': return 'bg-green-50 text-green-700 hover:bg-green-50'
      case 'cancelled': return 'bg-red-50 text-red-700 hover:bg-red-50'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const getStatusLabel = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    switch (s) {
      case 'pending': return 'Pendiente'
      case 'completed': return 'Completada'
      case 'cancelled': return 'Cancelada'
      default: return 'Pendiente'
    }
  }

  const getBranchName = (transfer: StockTransfer, type: 'source' | 'destination') => {
    // API returns snake_case: source_branch, destination_branch
    const branch = type === 'source'
      ? (transfer.source_branch || transfer.sourceBranch)
      : (transfer.destination_branch || transfer.destinationBranch)
    return branch?.description || branch?.name || 'N/A'
  }

  const resolveBranchColorFromTransfer = (transfer: StockTransfer, type: 'source' | 'destination') => {
    const branch = type === 'source'
      ? (transfer.source_branch || transfer.sourceBranch)
      : (transfer.destination_branch || transfer.destinationBranch)
    return getBranchColor({ branch: branch ?? undefined })
  }

  // Extract unique branches from transfers for filter options
  const getUniqueBranches = (): Option[] => {
    const branchMap = new Map<number, { id: number; name: string; color: string }>()

    transfers.forEach(transfer => {
      const sourceBranch = transfer.source_branch
      const destBranch = transfer.destination_branch

      if (sourceBranch?.id) {
        branchMap.set(sourceBranch.id, {
          id: sourceBranch.id,
          name: sourceBranch.description || sourceBranch.name || 'N/A',
          color: sourceBranch.color || '#6b7280'
        })
      }
      if (destBranch?.id) {
        branchMap.set(destBranch.id, {
          id: destBranch.id,
          name: destBranch.description || destBranch.name || 'N/A',
          color: destBranch.color || '#6b7280'
        })
      }
    })

    return Array.from(branchMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(branch => ({
        label: branch.name,
        value: String(branch.id)
      }))
  }

  const branchFilterNumbers = new Set(branchFilterUI.map(Number))

  const filteredTransfers = transfers.filter(transfer => {
    const sourceName = getBranchName(transfer, 'source').toLowerCase()
    const destName = getBranchName(transfer, 'destination').toLowerCase()
    const matchesSearch = sourceName.includes(searchTerm.toLowerCase()) || destName.includes(searchTerm.toLowerCase()) || (transfer.id?.toString() || '').includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || (transfer.status || '').toLowerCase() === statusFilter
    const matchesBranchFilter = branchFilterNumbers.size === 0
      ? true
      : branchFilterNumbers.has(Number(transfer.source_branch_id)) || branchFilterNumbers.has(Number(transfer.destination_branch_id))

    const isGlobalBranchFilterActive = selectedBranchIds.length > 0
    const globalBranchIds = new Set(selectedBranchIds.map(Number))
    const matchesGlobalBranchFilter = !isGlobalBranchFilterActive
      ? true
      : globalBranchIds.has(Number(transfer.source_branch_id)) || globalBranchIds.has(Number(transfer.destination_branch_id))

    let matchesDate = true
    if (dateRange?.from) {
      const transferDate = new Date(transfer.transfer_date)
      // Normalizar a inicio del día para comparación justa
      transferDate.setHours(0, 0, 0, 0)

      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)

      const to = dateRange.to ? new Date(dateRange.to) : new Date(from)
      to.setHours(23, 59, 59, 999)

      matchesDate = transferDate >= from && transferDate <= to
    }

    return matchesSearch && matchesStatus && matchesBranchFilter && matchesGlobalBranchFilter && matchesDate
  })

  const pendingTransfers = transfers.filter(t => isPending(t.status)).length
  const completedTransfers = transfers.filter(t => t.status === 'completed').length

  return (
    <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Transferencias de Stock</h2>
        {canCreate && (
          <Button onClick={() => setOpenNewTransfer(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transferencia
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
            <p className="text-xs text-muted-foreground">Transferencias registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransfers}</div>
            <p className="text-xs text-muted-foreground">Por completar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTransfers}</div>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-2">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Buscar..." className="w-full pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full md:w-48">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {branchFilterUI.length > 0
                  ? getUniqueBranches().find((branch) => branch.value === branchFilterUI[0])?.label
                  : "Filtrar por sucursal..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Buscar sucursal..." />
                <CommandEmpty>No se encontró la sucursal.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => setBranchFilterUI([])}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        branchFilterUI.length === 0 ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todas
                  </CommandItem>
                  {getUniqueBranches().map((branch) => (
                    <CommandItem
                      key={branch.value}
                      value={branch.label}
                      onSelect={() => {
                        setBranchFilterUI([branch.value])
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          branchFilterUI.includes(branch.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {branch.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-auto">
          <DatePickerWithRange
            selected={dateRange}
            onSelect={setDateRange}
            showClearButton={true}
            onClear={() => setDateRange(undefined)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        {filteredTransfers.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            {loading ? "Cargando..." : "No hay transferencias"}
          </div>
        ) : (
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <ResizableTableHeader columnId="number" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>N°</ResizableTableHeader>
                <ResizableTableHeader columnId="date" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Fecha</ResizableTableHeader>
                <ResizableTableHeader columnId="source" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Origen</ResizableTableHeader>
                <ResizableTableHeader columnId="destination" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Destino</ResizableTableHeader>
                <ResizableTableHeader columnId="items" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Items</ResizableTableHeader>
                <ResizableTableHeader columnId="user" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Solicitada por</ResizableTableHeader>
                <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Estado</ResizableTableHeader>
                <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <ResizableTableCell columnId="number" getColumnCellProps={getColumnCellProps}>#{transfer.id}</ResizableTableCell>
                  <ResizableTableCell columnId="date" getColumnCellProps={getColumnCellProps}>{new Date(transfer.transfer_date).toLocaleDateString('es-ES')}</ResizableTableCell>
                  <ResizableTableCell columnId="source" getColumnCellProps={getColumnCellProps}>
                    <BranchBadge
                      name={getBranchName(transfer, 'source')}
                      color={resolveBranchColorFromTransfer(transfer, 'source')}
                    />
                  </ResizableTableCell>
                  <ResizableTableCell columnId="destination" getColumnCellProps={getColumnCellProps}>
                    <BranchBadge
                      name={getBranchName(transfer, 'destination')}
                      color={resolveBranchColorFromTransfer(transfer, 'destination')}
                    />
                  </ResizableTableCell>
                  <ResizableTableCell columnId="items" getColumnCellProps={getColumnCellProps}>{transfer.items?.length || 0}</ResizableTableCell>
                  <ResizableTableCell columnId="user" getColumnCellProps={getColumnCellProps}>
                    {transfer.user?.name || transfer.user?.username || 'N/A'}
                  </ResizableTableCell>
                  <ResizableTableCell columnId="status" getColumnCellProps={getColumnCellProps}>
                    <Badge variant="outline" className={getStatusBadgeColor(transfer.status)}>{getStatusLabel(transfer.status)}</Badge>
                  </ResizableTableCell>
                  <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-center">
                    <div className="flex gap-1 justify-center">
                      {/* View button - always visible */}
                      <Button variant="ghost" size="icon" onClick={() => { setViewTransferId(transfer.id!); setViewDialogOpen(true); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Ver detalles">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* Action buttons - only for pending transfers with permissions */}
                      {isPending(transfer.status) && transfer.id && (
                        <>
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => setEditTransferId(transfer.id!)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canComplete && (
                            <Button variant="ghost" size="icon" onClick={() => setTransferToComplete(transfer.id!)} className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Completar">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {canCancel && (
                            <Button variant="ghost" size="icon" onClick={() => setTransferToCancel(transfer.id!)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Cancelar">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {/* Export dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hover:bg-gray-50" title="Más opciones">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => exportTransferToPDF({
                              transfer,
                              getStatusLabel,
                              getBranchName
                            })}
                            className="cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2 text-red-600" />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportTransferToExcel({
                              transfer,
                              getStatusLabel,
                              getBranchName
                            })}
                            className="cursor-pointer"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                            Exportar Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ResizableTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <NewStockTransferDialog
        open={openNewTransfer}
        onOpenChange={setOpenNewTransfer}
        onSaved={handleTransferSaved}
        visibleBranchIds={selectedBranchIds}
      />

      {/* Edit Dialog - reuses StockTransferDialog with transferId */}
      <StockTransferDialog
        open={editTransferId !== null}
        onOpenChange={(open) => !open && setEditTransferId(null)}
        onSaved={handleTransferSaved}
        transferId={editTransferId ?? undefined}
      />

      <ViewStockTransferDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} transferId={viewTransferId} />

      <AlertDialog open={transferToComplete !== null} onOpenChange={() => setTransferToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Completar Transferencia</AlertDialogTitle>
            <AlertDialogDescription>¿Completar esta transferencia? El stock se moverá entre sucursales.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => transferToComplete && handleCompleteTransfer(transferToComplete)}>Completar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={transferToCancel !== null} onOpenChange={() => setTransferToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Transferencia</AlertDialogTitle>
            <AlertDialogDescription>¿Cancelar esta transferencia?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => transferToCancel && handleCancelTransfer(transferToCancel)}>Sí, Cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={transferToDelete !== null} onOpenChange={() => setTransferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Transferencia</AlertDialogTitle>
            <AlertDialogDescription>¿Eliminar esta transferencia?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => transferToDelete && handleDeleteTransfer(transferToDelete)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
