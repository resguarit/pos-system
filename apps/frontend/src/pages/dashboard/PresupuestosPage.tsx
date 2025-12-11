import { useState, useEffect } from 'react'
import { type Budget } from '@/hooks/useBudgets'
import useApi from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/utils/sale-calculations'
import { FileCheck, Trash2, Eye, Loader2, AlertCircle, FileText, Download, Printer, Check, X } from 'lucide-react'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

interface ReceiptType {
    id: number
    name: string
    afip_code?: string
}

interface PresupuestosPageProps {
    budgets: Budget[]
    loading: boolean
    actionLoading: number | null
    showBranchColumn?: boolean
    onConvert: (budgetId: number, receiptTypeId: number) => Promise<any>
    onDelete: (budgetId: number) => Promise<any>
    onApprove: (budgetId: number) => Promise<any>
    onViewDetail: (budget: Budget) => void
}

export default function PresupuestosPage({
    budgets,
    loading,
    actionLoading,
    showBranchColumn = true,
    onConvert,
    onDelete,
    onApprove,
    onViewDetail
}: PresupuestosPageProps) {
    const { hasPermission } = useAuth()
    const { request } = useApi()

    const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])

    // Dialog states
    const [showConvertDialog, setShowConvertDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
    const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState<number | null>(null)

    const canManageBudgets = hasPermission('gestionar_presupuestos')

    // Resizable columns configuration matching Sales table
    const columnConfig = [
        { id: 'number', minWidth: 80, maxWidth: 120, defaultWidth: 90 },
        { id: 'customer', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
        { id: 'receipt_type', minWidth: 150, maxWidth: 250, defaultWidth: 120 },
        { id: 'branch', minWidth: 100, maxWidth: 200, defaultWidth: 150 },
        { id: 'items', minWidth: 60, maxWidth: 100, defaultWidth: 80 },
        { id: 'date', minWidth: 80, maxWidth: 150, defaultWidth: 100 },
        { id: 'total', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'actions', minWidth: 150, maxWidth: 250, defaultWidth: 200 },
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        getColumnCellProps,
        tableRef
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: 'presupuestos-table-columns',
        defaultWidth: 100
    });

    // Fetch available receipt types for conversion
    useEffect(() => {
        const fetchReceiptTypes = async () => {
            try {
                const response = await request({ method: 'GET', url: '/receipt-types' })
                const allTypes = Array.isArray(response) ? response :
                    Array.isArray(response?.data?.data) ? response.data.data :
                        Array.isArray(response?.data) ? response.data : []

                // Filter only invoice types (not presupuesto)
                const invoiceTypes = allTypes
                    .filter((item: any) => item.afip_code !== '016' && [2, 3, 8, 13, 17].includes(item.id))
                    .map((item: any): ReceiptType => ({
                        id: item.id,
                        name: item.description || item.name,
                        afip_code: item.afip_code
                    }))

                setReceiptTypes(invoiceTypes)
            } catch (error) {
                console.error('Error fetching receipt types:', error)
            }
        }
        fetchReceiptTypes()
    }, [request])

    const handleConvertClick = (budget: Budget) => {
        setSelectedBudget(budget)
        setSelectedReceiptTypeId(receiptTypes[0]?.id || null)
        setShowConvertDialog(true)
    }

    const handleDeleteClick = (budget: Budget) => {
        setSelectedBudget(budget)
        setShowDeleteDialog(true)
    }

    const handleApproveClick = async (budget: Budget) => {
        try {
            await onApprove(budget.id)
        } catch (error) {
            // Error handled in parent
        }
    }

    const handleConvertConfirm = async () => {
        if (!selectedBudget || !selectedReceiptTypeId) return

        try {
            await onConvert(selectedBudget.id, selectedReceiptTypeId)
            setShowConvertDialog(false)
            setSelectedBudget(null)
        } catch (error) {
            // Error is handled in the hook/parent
        }
    }

    const handleDeleteConfirm = async () => {
        if (!selectedBudget) return

        try {
            await onDelete(selectedBudget.id)
            setShowDeleteDialog(false)
            setSelectedBudget(null)
        } catch (error) {
            // Error is handled in the hook/parent
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Pendiente</Badge>
            case 'approved':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Aprobado</Badge>
            case 'active':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Vigente</Badge>
            case 'converted':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Convertido</Badge>
            case 'annulled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Anulado</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Compact info for users who can convert */}
            {canManageBudgets && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Los presupuestos activos pueden ser convertidos a ventas. Al convertir, se reduce el stock y se registran los movimientos de caja.</span>
                </div>
            )}

            {/* Budgets Table */}
            <div className="rounded-md border">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p>No hay presupuestos para mostrar</p>
                    </div>
                ) : (
                    <Table ref={tableRef}>
                        <TableHeader>
                            <TableRow>
                                <ResizableTableHeader columnId="number" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Nº Venta</ResizableTableHeader>
                                <ResizableTableHeader columnId="customer" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Cliente</ResizableTableHeader>
                                <ResizableTableHeader columnId="receipt_type" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Comprobante</ResizableTableHeader>
                                <ResizableTableHeader columnId="branch" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className={showBranchColumn ? "" : "hidden"}>Sucursal</ResizableTableHeader>
                                <ResizableTableHeader columnId="items" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center">Items</ResizableTableHeader>
                                <ResizableTableHeader columnId="date" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Fecha</ResizableTableHeader>
                                <ResizableTableHeader columnId="total" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-right">Total</ResizableTableHeader>
                                <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {budgets.map((budget) => (
                                <TableRow key={budget.id} className={budget.status === 'annulled' ? 'bg-red-50' : ''}>
                                    <ResizableTableCell columnId="number" getColumnCellProps={getColumnCellProps} className="font-medium">
                                        {budget.receipt_number.replace(/^#/, '')}
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="customer" getColumnCellProps={getColumnCellProps}>
                                        <div className="truncate" title={budget.customer === 'N/A' ? '-' : budget.customer}>
                                            {budget.customer === 'N/A' ? '-' : budget.customer}
                                        </div>
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="receipt_type" getColumnCellProps={getColumnCellProps}>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                PRESUPUESTO
                                            </Badge>
                                            {getStatusBadge(budget.status)}
                                        </div>
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="branch" getColumnCellProps={getColumnCellProps} className={showBranchColumn ? "" : "hidden"}>
                                        <Badge
                                            variant="outline"
                                            className="text-xs border-2 font-medium"
                                            style={{
                                                borderColor: budget.branch_color || '#e2e8f0',
                                                color: budget.branch_color || '#64748b',
                                                backgroundColor: budget.branch_color ? `${budget.branch_color}10` : '#f8fafc'
                                            }}
                                        >
                                            {budget.branch}
                                        </Badge>
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="items" getColumnCellProps={getColumnCellProps} className="text-center">
                                        {budget.items_count}
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="date" getColumnCellProps={getColumnCellProps}>
                                        {budget.date_display.split(' ')[0]}
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="total" getColumnCellProps={getColumnCellProps} className="text-right font-semibold">
                                        {formatCurrency(budget.total)}
                                    </ResizableTableCell>
                                    <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                                                onClick={() => onViewDetail(budget)}
                                                title="Ver Detalle"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {/* Actions for Pending Budgets */}
                                            {budget.status === 'pending' && canManageBudgets && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                                                    onClick={() => {
                                                        setSelectedBudget(budget)
                                                        setShowApproveDialog(true)
                                                    }}
                                                    disabled={actionLoading === budget.id}
                                                    title="Aprobar Presupuesto"
                                                >
                                                    {actionLoading === budget.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}

                                            {/* Actions for Approved/Active Budgets */}
                                            {(budget.status === 'active' || budget.status === 'approved') && canManageBudgets && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                                                    onClick={() => handleConvertClick(budget)}
                                                    title="Convertir a Venta"
                                                    disabled={actionLoading === budget.id}
                                                >
                                                    {actionLoading === budget.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <FileCheck className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}

                                            {/* Delete Action (requires gestionar_presupuestos permission) */}
                                            {budget.status !== 'converted' && budget.status !== 'annulled' && canManageBudgets && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                                                    onClick={() => handleDeleteClick(budget)}
                                                    title="Eliminar Presupuesto"
                                                    disabled={actionLoading === budget.id}
                                                >
                                                    {actionLoading === budget.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </ResizableTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Convert Dialog */}
            <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convertir Presupuesto a Venta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Selecciona el tipo de comprobante para la nueva venta basada en el presupuesto
                            <strong> #{selectedBudget?.receipt_number}</strong>.
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Comprobante</label>
                            <Select
                                value={selectedReceiptTypeId?.toString() || ''}
                                onValueChange={(value) => setSelectedReceiptTypeId(Number(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {receiptTypes.map((rt) => (
                                        <SelectItem key={rt.id} value={rt.id.toString()}>
                                            {rt.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedBudget && (
                            <Card className="bg-muted/50">
                                <CardContent className="pt-4 text-sm">
                                    <div className="flex justify-between">
                                        <span>Cliente:</span>
                                        <span className="font-medium">{selectedBudget.customer === 'N/A' ? '-' : selectedBudget.customer}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span className="font-semibold">{formatCurrency(selectedBudget.total)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancelar</Button>
                            <Button onClick={handleConvertConfirm} disabled={!selectedReceiptTypeId}>
                                Confirmar Conversión
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Presupuesto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Estás seguro de que deseas eliminar el presupuesto
                            <strong> #{selectedBudget?.receipt_number}</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleDeleteConfirm}>
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmación de Aprobación */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Aprobación</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>¿Estás seguro de que deseas aprobar el presupuesto <strong>#{selectedBudget?.receipt_number}</strong>?</p>
                        <p className="text-sm text-gray-500 mt-2">El presupuesto pasará a estado "Aprobado" y podrá ser convertido a venta.</p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancelar</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                if (selectedBudget) {
                                    onApprove(selectedBudget.id)
                                    setShowApproveDialog(false)
                                }
                            }}
                        >
                            Confirmar Aprobación
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
