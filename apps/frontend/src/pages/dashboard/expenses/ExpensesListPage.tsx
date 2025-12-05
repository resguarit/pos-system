import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Eye, Pencil, Trash2, RotateCw, Plus, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import useApi from "@/hooks/useApi"
import { Link } from "react-router-dom"
import Pagination from "@/components/ui/pagination"
import { toast } from "sonner"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    due_date: string | null;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    category: {
        id: number;
        name: string;
    };
    employee?: {
        id: number;
        person: {
            first_name: string;
            last_name: string;
        }
    };
    is_recurring: boolean;
    recurrence_interval: string | null;
}

export default function ExpensesListPage() {
    const { request, loading } = useApi();
    const { hasPermission } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const PAGE_SIZE = 10

    // Column configuration
    const columnConfig = [
        { id: 'description', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
        { id: 'category', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
        { id: 'amount', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'date', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        getColumnCellProps,
        tableRef
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: 'expenses-column-widths',
        defaultWidth: 150
    });

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchExpenses = useCallback(async (page = 1) => {
        try {
            const params: any = { page, limit: PAGE_SIZE };
            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }

            const response = await request({
                method: "GET",
                url: "/expenses",
                params
            });

            if (response && response.success) {
                const data = response.data;
                setExpenses(data.data || []);
                setTotalItems(data.total || 0);
                setCurrentPage(data.current_page || 1);
                setTotalPages(data.last_page || 1);
            }
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast.error("Error al cargar los gastos");
        }
    }, [request, debouncedSearchTerm]);

    useEffect(() => {
        fetchExpenses(currentPage);
    }, [fetchExpenses, currentPage]);

    const handleDeleteClick = (id: number) => {
        setExpenseToDelete(id)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!expenseToDelete) return

        try {
            await request({ method: "DELETE", url: `/expenses/${expenseToDelete}` })
            toast.success('Gasto eliminado correctamente')
            fetchExpenses(currentPage);
            setDeleteDialogOpen(false)
            setExpenseToDelete(null)
        } catch (error: any) {
            toast.error(error?.message || 'Error al eliminar el gasto')
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            approved: "bg-blue-100 text-blue-800 hover:bg-blue-100",
            paid: "bg-green-100 text-green-800 hover:bg-green-100",
            cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
        };
        const labels: Record<string, string> = {
            pending: "Pendiente",
            approved: "Aprobado",
            paid: "Pagado",
            cancelled: "Cancelado",
        };
        return (
            <Badge variant="outline" className={styles[status] || ""}>
                {labels[status] || status}
            </Badge>
        );
    };

    // Projection calculation (simple client-side for now)
    const totalPending = expenses
        .filter(e => e.status === 'pending' || e.status === 'approved')
        .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalRecurring = expenses
        .filter(e => e.is_recurring && e.status !== 'cancelled')
        .reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gastos</h2>
                    <p className="text-muted-foreground">Gestión y control de gastos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchExpenses(currentPage)} disabled={loading} title="Refrescar">
                        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    {hasPermission('crear_gastos') && (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Gasto
                        </Button>
                    )}
                </div>
            </div>

            {/* Proyección de Gastos Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendiente de Pago</CardTitle>
                        <Calendar className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Gastos pendientes y aprobados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gastos Recurrentes</CardTitle>
                        <RotateCw className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRecurring.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Proyección mensual estimada</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar gastos..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading && expenses.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando gastos...
                </div>
            ) : (
                <div className="rounded-md border bg-card">
                    {expenses.length > 0 ? (
                        <div className="relative">
                            <Table ref={tableRef} className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <ResizableTableHeader columnId="description" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descripción</ResizableTableHeader>
                                        <ResizableTableHeader columnId="category" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Categoría</ResizableTableHeader>
                                        <ResizableTableHeader columnId="amount" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Monto</ResizableTableHeader>
                                        <ResizableTableHeader columnId="date" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Fecha</ResizableTableHeader>
                                        <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Estado</ResizableTableHeader>
                                        <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-right">Acciones</ResizableTableHeader>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <ResizableTableCell columnId="description" getColumnCellProps={getColumnCellProps}>
                                                <div className="font-medium">{expense.description}</div>
                                                {expense.is_recurring && <Badge variant="secondary" className="mt-1 text-xs">Recurrente</Badge>}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="category" getColumnCellProps={getColumnCellProps}>
                                                {expense.category?.name || '-'}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="amount" getColumnCellProps={getColumnCellProps}>
                                                ${Number(expense.amount).toLocaleString()}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="date" getColumnCellProps={getColumnCellProps}>
                                                {new Date(expense.date).toLocaleDateString()}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="status" getColumnCellProps={getColumnCellProps}>
                                                {getStatusBadge(expense.status)}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {hasPermission('editar_gastos') && (
                                                        <Button variant="ghost" size="icon" title="Editar">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('eliminar_gastos') && (
                                                        <Button variant="ghost" size="icon" title="Eliminar" onClick={() => handleDeleteClick(expense.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </ResizableTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">No hay gastos registrados</div>
                    )}
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                lastPage={totalPages}
                total={totalItems}
                itemName="gastos"
                onPageChange={setCurrentPage}
                disabled={loading}
                className="mt-4 mb-6"
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
