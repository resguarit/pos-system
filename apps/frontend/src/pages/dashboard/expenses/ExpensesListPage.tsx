/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Pencil, Trash2, RotateCw, Plus, X, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import useApi from "@/hooks/useApi"
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

import { NewExpenseDialog, EditExpenseDialog } from "@/components/expenses"
import { ExpensesStats } from "@/components/expenses/ExpensesStats"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange, DateRange } from "@/components/ui/date-range-picker"
import { format } from "date-fns"

interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    due_date: string | null;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    category_id: number;
    category: {
        id: number;
        name: string;
    };
    employee_id: number | null;
    employee?: {
        id: number;
        person: {
            first_name: string;
            last_name: string;
        }
    };
    branch_id: number;
    is_recurring: boolean;
    recurrence_interval: string | null;
    notes: string | null;
}

interface Branch {
    id: number;
    description: string; // Changed from name to description
}

export default function ExpensesListPage() {
    const { request, loading } = useApi();
    const { hasPermission } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

    // Filters
    const [filters, setFilters] = useState({
        branch_id: 'all',
        status: 'all',
        start_date: '',
        end_date: ''
    });
    const [branches, setBranches] = useState<Branch[]>([]);
    const [stats, setStats] = useState({ by_category: [], by_month: [] });
    const [statsLoading, setStatsLoading] = useState(false);

    // Initialize date range with default: first day of current month to today
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            from: firstDayOfMonth,
            to: today
        };
    });

    // Dialog states
    const [newDialogOpen, setNewDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
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

    // Load branches
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const response = await request({ method: 'GET', url: '/branches' });
                if (response.success) setBranches(response.data);
            } catch (error) {
                console.error("Error loading branches", error);
            }
        };
        loadBranches();
    }, [request]);

    // Update filters when dateRange changes
    useEffect(() => {
        if (dateRange?.from) {
            setFilters(prev => ({
                ...prev,
                start_date: format(dateRange.from, 'yyyy-MM-dd'),
                end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
            }))
        } else {
            setFilters(prev => ({
                ...prev,
                start_date: '',
                end_date: ''
            }))
        }
    }, [dateRange])

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
            if (filters.branch_id !== 'all') params.branch_id = filters.branch_id;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const response = await request({
                method: "GET",
                url: "/expenses",
                params
            });

            if (response && response.success) {
                setExpenses(response.data || []);
                setTotalItems(response.total || 0);
                setCurrentPage(response.current_page || 1);
                setTotalPages(response.last_page || 1);
            }
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast.error("Error al cargar los gastos");
        }
    }, [request, debouncedSearchTerm, filters]);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const params: any = {};
            if (filters.branch_id !== 'all') params.branch_id = filters.branch_id;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const response = await request({ method: 'GET', url: '/expenses/stats', params });
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setStatsLoading(false);
        }
    }, [request, filters]);

    useEffect(() => {
        fetchExpenses(currentPage);
    }, [fetchExpenses, currentPage]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleEditClick = (expense: Expense) => {
        setSelectedExpense(expense)
        setEditDialogOpen(true)
    }

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
            fetchStats();
            setDeleteDialogOpen(false)
            setExpenseToDelete(null)
        } catch (error: any) {
            toast.error(error?.message || 'Error al eliminar el gasto')
        }
    }

    const handlePayClick = async (expense: Expense) => {
        try {
            await request({
                method: "PUT",
                url: `/expenses/${expense.id}`,
                data: { status: 'paid' }
            });
            toast.success('Gasto marcado como pagado');
            fetchExpenses(currentPage);
            fetchStats();
        } catch (error: any) {
            toast.error(error?.message || 'Error al pagar el gasto');
        }
    }

    const handleDialogSuccess = () => {
        fetchExpenses(currentPage);
        fetchStats();
    }

    const clearFilters = () => {
        setFilters({
            branch_id: 'all',
            status: 'all',
            start_date: '',
            end_date: ''
        });
        setSearchTerm('');

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRange({
            from: firstDayOfMonth,
            to: today
        });
    };

    const getStatusBadge = (expense: Expense) => {
        const isOverdue = expense.status === 'pending' && expense.due_date && new Date(expense.due_date) < new Date();

        if (isOverdue) {
            return (
                <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                    Vencida
                </Badge>
            );
        }

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
            <Badge variant="outline" className={styles[expense.status] || ""}>
                {labels[expense.status] || expense.status}
            </Badge>
        );
    };

    return (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gastos</h2>
                    <p className="text-muted-foreground">Gestión y control de gastos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => { fetchExpenses(currentPage); fetchStats(); }} disabled={loading} title="Refrescar">
                        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    {hasPermission('crear_gastos') && (
                        <Button onClick={() => setNewDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Gasto
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Dashboard */}
            <ExpensesStats stats={stats} loading={statsLoading} />

            {/* Filters Section */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                    <div className="relative w-full md:w-80 shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar gastos..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filters.branch_id} onValueChange={(v) => setFilters({ ...filters, branch_id: v })}>
                        <SelectTrigger className="w-[180px] shrink-0">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.description}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                        <SelectTrigger className="w-[180px] shrink-0">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="approved">Aprobado</SelectItem>
                            <SelectItem value="paid">Pagado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                    <div className="w-full md:w-auto">
                        <DatePickerWithRange
                            selected={dateRange}
                            onSelect={setDateRange}
                            className="w-full md:w-[260px]"
                            align="end"
                            side="top"
                        />
                    </div>
                    {(filters.branch_id !== 'all' || filters.status !== 'all' || filters.start_date || searchTerm) && (
                        <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros" className="shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
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
                                                {expense.is_recurring && (
                                                    <div className="mt-1">
                                                        {(() => {
                                                            const interval = expense.recurrence_interval || 'monthly';
                                                            const styles: Record<string, string> = {
                                                                daily: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
                                                                weekly: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200",
                                                                monthly: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200",
                                                                yearly: "bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200",
                                                            };
                                                            const labels: Record<string, string> = {
                                                                daily: "Diario",
                                                                weekly: "Semanal",
                                                                monthly: "Mensual",
                                                                yearly: "Anual",
                                                            };
                                                            return (
                                                                <Badge variant="secondary" className={`text-xs ${styles[interval] || styles.monthly}`}>
                                                                    {labels[interval] || 'Recurrente'}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
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
                                                {getStatusBadge(expense)}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {(expense.status === 'pending' || expense.status === 'approved') && hasPermission('editar_gastos') && (
                                                        <Button variant="ghost" size="icon" title="Pagar" onClick={() => handlePayClick(expense)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                            <DollarSign className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('editar_gastos') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={expense.status === 'paid' ? "No se puede editar un gasto pagado" : "Editar"}
                                                            onClick={() => handleEditClick(expense)}
                                                            disabled={expense.status === 'paid'}
                                                            className={expense.status === 'paid' ? "opacity-50 cursor-not-allowed" : ""}
                                                        >
                                                            <Pencil className="h-4 w-4 text-orange-500" />
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

            {/* New Expense Dialog */}
            <NewExpenseDialog
                open={newDialogOpen}
                onOpenChange={setNewDialogOpen}
                onSuccess={handleDialogSuccess}
            />

            {/* Edit Expense Dialog */}
            <EditExpenseDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                expense={selectedExpense}
                onSuccess={handleDialogSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
                            {expenses.find(e => e.id === expenseToDelete)?.status === 'paid' && (
                                <span className="block mt-2 font-semibold text-red-600">
                                    ¡Atención! Este gasto está pagado. Al eliminarlo, se revertirá el movimiento de caja asociado y se actualizarán los saldos.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

