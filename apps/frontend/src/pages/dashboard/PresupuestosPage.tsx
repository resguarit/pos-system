import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Budget } from '@/hooks/useBudgets'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/utils/sale-calculations'
import { FileCheck, Trash2, Eye, Loader2, AlertCircle, FileText, Check } from 'lucide-react'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header'
import { useAuth } from '@/context/AuthContext'
import { ConversionStatusBadge } from '@/components/sales/conversion-status-badge'

interface PresupuestosPageProps {
    budgets: Budget[]
    loading: boolean
    actionLoading: number | null
    showBranchColumn?: boolean
    cashRegisterId?: number | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onConvert: (budgetId: number, receiptTypeId: number, cashRegisterId?: number, paymentMethodId?: number) => Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDelete: (budgetId: number) => Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onApprove: (budgetId: number) => Promise<any>
    onViewDetail: (budget: Budget) => void
}

export default function PresupuestosPage({
    budgets,
    loading,
    actionLoading,
    showBranchColumn = true,
    onDelete,
    onApprove,
    onViewDetail
}: PresupuestosPageProps) {
    const { hasPermission } = useAuth()
    const navigate = useNavigate()

    // Dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)

    const canManageBudgets = hasPermission('gestionar_presupuestos')

    // Resizable columns configuration matching Sales table
    const columnConfig = [
        { id: 'number', minWidth: 80, maxWidth: 300, defaultWidth: 220 },
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

    const handleConvertClick = (budget: Budget) => {
        // Redirect to POS with the budget data
        navigate('/dashboard/pos', {
            state: {
                budgetToEdit: budget,
                isConversion: true,
                branchId: budget.branch_id
            }
        })
    }

    const handleDeleteClick = (budget: Budget) => {
        setSelectedBudget(budget)
        setShowDeleteDialog(true)
    }

    const handleApproveClick = (budget: Budget) => {
        setSelectedBudget(budget)
        setShowApproveDialog(true)
    }

    const handleApproveConfirm = async () => {
        if (!selectedBudget) return

        try {
            await onApprove(selectedBudget.id)
            setShowApproveDialog(false)
            setSelectedBudget(null)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                    <span>Los presupuestos activos pueden ser convertidos a ventas. Al convertir, serás redirigido al POS para completar la venta.</span>
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
                                        <div className="flex items-center gap-1">
                                            <span>{budget.receipt_number.replace(/^#/, '')}</span>
                                            <ConversionStatusBadge
                                                convertedToSaleId={budget.converted_to_sale_id}
                                                convertedToSaleReceipt={budget.converted_to_sale_receipt}
                                            />
                                        </div>
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
                                                    onClick={() => handleApproveClick(budget)}
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

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                {/* @ts-expect-error - DialogContent props mismatch */}
                <DialogContent>
                    <DialogHeader>
                        {/* @ts-expect-error - DialogTitle children type mismatch */}
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
                {/* @ts-expect-error - DialogContent props mismatch */}
                <DialogContent>
                    <DialogHeader>
                        {/* @ts-expect-error - DialogTitle children type mismatch */}
                        <DialogTitle>Aprobar Presupuesto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Estás seguro de que deseas aprobar el presupuesto
                            <strong> #{selectedBudget?.receipt_number}</strong>?
                        </p>

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

                        <p className="text-xs text-muted-foreground">
                            El presupuesto pasará a estado "Aprobado" y podrá ser convertido a venta.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancelar</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleApproveConfirm}
                        >
                            Confirmar Aprobación
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
