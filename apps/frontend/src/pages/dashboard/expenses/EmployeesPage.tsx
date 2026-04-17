import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Pencil, Trash2, RotateCw, Plus, Link2, Eye, User, History } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import useApi from "@/hooks/useApi"
import { useBranch } from "@/context/BranchContext"
import { usePersistentState } from "@/hooks/usePersistentState"
import Pagination from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import { sileo } from "sileo"
import { dispatchExpensesChanged } from "@/utils/expensesEvents"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { NewEmployeeDialog, EditEmployeeDialog } from "@/components/expenses"

interface Employee {
    id: number;
    person_id: number;
    user_id: number | null;
    branch_id: number;
    person: {
        id: number;
        first_name: string;
        last_name: string;
        documento?: string;
        phone?: string;
        email?: string;
        address?: string;
        cuit?: string;
    };
    user?: {
        id: number;
        email: string;
    };
    job_title: string;
    salary: number;
    monthly_settlement_amount?: number;
    status: 'active' | 'inactive' | 'terminated';
    hire_date: string;
    branches?: Array<{
        id: number;
        description?: string;
        name?: string;
        razon_social?: string;
        deleted_at?: string | null;
        status?: boolean | number | string;
    }>;
    branch?: {
        id: number;
        description?: string;
        name?: string;
        razon_social?: string;
        deleted_at?: string | null;
        status?: boolean | number | string;
    } | null;
}

interface SettlementHistoryItem {
    id: number;
    description: string;
    amount: number;
    date: string;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    payment_method_id?: number | null;
    affects_cash_balance?: boolean;
    category?: {
        id: number;
        name: string;
    };
}

export default function EmployeesPage() {
    const { request, loading } = useApi();
    const { hasPermission } = useAuth();
    const { branches, allBranches } = useBranch();
    const monthOptions = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];

    const [employees, setEmployees] = useState<Employee[]>([])
    const [searchTerm, setSearchTerm] = usePersistentState("searchTerm", "")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [selectedMonth, setSelectedMonth] = usePersistentState("employeesSettlementMonth", new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = usePersistentState("employeesSettlementYear", new Date().getFullYear())
    const [periodLabel, setPeriodLabel] = useState("")
    const [settlementDialogOpen, setSettlementDialogOpen] = useState(false)
    const [employeeToSettle, setEmployeeToSettle] = useState<Employee | null>(null)
    const [settlementLoading, setSettlementLoading] = useState(false)
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1)
    const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
    const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null)
    const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([])
    const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; name: string }>>([])
    const [settlementForm, setSettlementForm] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: '',
        branch_id: '',
        payment_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        payment_method_id: '',
        affects_cash_balance: true,
        description: '',
    })

    // Dialog states
    const [newDialogOpen, setNewDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [viewOnlyMode, setViewOnlyMode] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null)

    const [currentPage, setCurrentPage] = usePersistentState("currentPage", 1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const PAGE_SIZE = 10

    const columnConfig = [
        { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
        { id: 'job_title', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
        { id: 'salary', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'monthly_settlement', minWidth: 140, maxWidth: 220, defaultWidth: 170 },
        { id: 'hire_date', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
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
        storageKey: 'employees-column-widths',
        defaultWidth: 150
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, setCurrentPage]);

    useEffect(() => {
        if (!settlementDialogOpen) return;

        const loadPaymentMethods = async () => {
            try {
                const response = await request({ method: 'GET', url: '/payment-methods?active=true' });
                const methods = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];
                setPaymentMethods(methods.filter((method: { name?: string }) => method.name !== 'Cuenta Corriente'));
            } catch {
                setPaymentMethods([]);
            }
        };

        loadPaymentMethods();
    }, [request, settlementDialogOpen]);

    const fetchEmployees = useCallback(async (page = 1) => {
        try {
            const params: Record<string, string | number> = {
                page,
                limit: PAGE_SIZE,
                month: selectedMonth,
                year: selectedYear,
            };
            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }

            const response = await request({
                method: "GET",
                url: "/employees",
                params
            });

            if (response && response.success) {
                setEmployees(response.data || []);
                setTotalItems(response.total || 0);
                setCurrentPage(response.current_page || 1);
                setTotalPages(response.last_page || 1);
                setPeriodLabel(response.period?.label || '');
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
            sileo.error({ title: "Error al cargar empleados" });
        }
    }, [request, debouncedSearchTerm, selectedMonth, selectedYear, setCurrentPage]);

    useEffect(() => {
        fetchEmployees(currentPage);
    }, [fetchEmployees, currentPage]);

    const handleViewClick = (employee: Employee) => {
        setSelectedEmployee(employee)
        setViewOnlyMode(true)
        setEditDialogOpen(true)
    }

    const handleEditClick = (employee: Employee) => {
        setSelectedEmployee(employee)
        setViewOnlyMode(false)
        setEditDialogOpen(true)
    }

    const handleDeleteClick = (id: number) => {
        setEmployeeToDelete(id)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!employeeToDelete) return

        try {
            await request({ method: "DELETE", url: `/employees/${employeeToDelete}` })
            sileo.success({ title: 'Empleado eliminado correctamente' })
            fetchEmployees(currentPage);
            setDeleteDialogOpen(false)
            setEmployeeToDelete(null)
        } catch (error: unknown) {
            const err = error as { message?: string }
            sileo.error({ title: err?.message || 'Error al eliminar el empleado' })
        }
    }

    const handleDialogSuccess = () => {
        fetchEmployees(currentPage);
    }

    const isGenericBranchLabel = (label?: string, branchId?: number) => {
        if (!label || typeof branchId !== 'number') return false
        return label.trim().toLowerCase() === `sucursal ${branchId}`
    }

    const pickBranchLabel = (
        branchLike: { id?: number | string; description?: string; name?: string; razon_social?: string } | undefined,
        branchId: number,
        allowGeneric = false
    ) => {
        if (!branchLike) return undefined

        const candidates = [branchLike.description, branchLike.name, branchLike.razon_social]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)

        if (allowGeneric) {
            return candidates[0]
        }

        return candidates.find((value) => !isGenericBranchLabel(value, branchId))
    }

    const getBranchDescription = (branchId: number, fallback?: string, employee?: Employee | null) => {
        const fromEmployee = employee?.branches?.find((branch) => Number(branch.id) === Number(branchId));
        const fromEmployeePrimaryBranch = employee?.branch && Number(employee.branch.id) === Number(branchId)
            ? employee.branch
            : undefined;
        const fromAllBranches = allBranches.find((branch) => Number(branch.id) === Number(branchId));
        const fromVisibleBranches = branches.find((branch) => Number(branch.id) === Number(branchId));

        return pickBranchLabel(fromEmployee, branchId)
            || pickBranchLabel(fromEmployeePrimaryBranch, branchId)
            || pickBranchLabel(fromAllBranches, branchId)
            || pickBranchLabel(fromVisibleBranches, branchId)
            || (fallback && !isGenericBranchLabel(fallback, branchId) ? fallback : undefined)
            || pickBranchLabel(fromEmployee, branchId, true)
            || pickBranchLabel(fromEmployeePrimaryBranch, branchId, true)
            || pickBranchLabel(fromAllBranches, branchId, true)
            || pickBranchLabel(fromVisibleBranches, branchId, true)
            || fallback
            || `Sucursal ${branchId}`;
    }

    const isBranchActiveForSettlement = (branchLike?: { deleted_at?: string | null; status?: boolean | number | string } | null) => {
        if (!branchLike || branchLike.deleted_at) return false

        if (typeof branchLike.status === 'boolean') return branchLike.status
        if (typeof branchLike.status === 'number') return branchLike.status === 1
        if (typeof branchLike.status === 'string') {
            const normalized = branchLike.status.toLowerCase()
            return normalized === '1' || normalized === 'true' || normalized === 'active' || normalized === 'activo'
        }

        return true
    }

    const getSettlementBranchOptions = (employee?: Employee | null) => {
        if (!employee) return []

        const pushUnique = (
            list: Array<{ id: number | string; description?: string; name?: string; razon_social?: string; deleted_at?: string | null; status?: boolean | number | string }>,
            branchLike: { id: number | string; description?: string; name?: string; razon_social?: string; deleted_at?: string | null; status?: boolean | number | string } | undefined | null,
        ) => {
            if (!branchLike || !isBranchActiveForSettlement(branchLike)) return
            const exists = list.some((item) => Number(item.id) === Number(branchLike.id))
            if (!exists) {
                list.push(branchLike)
            }
        }

        const options: Array<{ id: number | string; description?: string; name?: string; razon_social?: string; deleted_at?: string | null; status?: boolean | number | string }> = []

        const employeeBranches = employee.branches ?? []
        if (employeeBranches.length > 0) {
            employeeBranches.forEach((branch) => pushUnique(options, branch))
        }

        if (employee.branch?.id) {
            pushUnique(options, employee.branch)
        }

        const resolvedBranch = allBranches.find((branch) => Number(branch.id) === Number(employee.branch_id))
            || branches.find((branch) => Number(branch.id) === Number(employee.branch_id))

        if (resolvedBranch) {
            pushUnique(options, resolvedBranch)
        }

        // If employee has no active assigned branches, allow selecting any active branch.
        if (options.length === 0) {
            allBranches.forEach((branch) => pushUnique(options, branch))
            branches.forEach((branch) => pushUnique(options, branch))
        }

        return options
    }

    const hasAssignedActiveSettlementBranch = (employee?: Employee | null) => {
        if (!employee) return false
        if ((employee.branches ?? []).some((branch) => isBranchActiveForSettlement(branch))) return true
        if (employee.branch && isBranchActiveForSettlement(employee.branch)) return true
        return false
    }

    const openSettlementDialog = (employee: Employee) => {
        const branchOptions = getSettlementBranchOptions(employee)
        const defaultBranchId = branchOptions[0]?.id;

        setEmployeeToSettle(employee)
        setSettlementForm({
            month: selectedMonth,
            year: selectedYear,
            amount: Number(employee.salary || 0).toString(),
            branch_id: defaultBranchId ? String(defaultBranchId) : '',
            payment_date: new Date().toISOString().slice(0, 10),
            due_date: '',
            payment_method_id: '',
            affects_cash_balance: true,
            description: '',
        })
        setSettlementDialogOpen(true)
    }

    const submitSettlement = async () => {
        if (!employeeToSettle) return

        const amount = Number(settlementForm.amount)
        if (Number.isNaN(amount) || amount < 0) {
            sileo.error({ title: 'El monto de liquidación no es válido' })
            return
        }

        if (!settlementForm.payment_date) {
            sileo.error({ title: 'La fecha de pago es obligatoria' })
            return
        }

        if (!settlementForm.branch_id) {
            sileo.error({ title: 'Seleccioná una sucursal para registrar la liquidación' })
            return
        }

        const validBranchIds = new Set(
            getSettlementBranchOptions(employeeToSettle).map((branch) => Number(branch.id))
        )

        if (!validBranchIds.has(Number(settlementForm.branch_id))) {
            sileo.error({ title: 'La sucursal seleccionada no está disponible para esta liquidación. Reabrí el formulario e intentá nuevamente.' })
            return
        }

        if (!settlementForm.payment_method_id) {
            sileo.error({ title: 'Seleccioná un medio de pago para registrar la liquidación' })
            return
        }

        try {
            setSettlementLoading(true)

            await request({
                method: 'POST',
                url: `/employees/${employeeToSettle.id}/settlements`,
                data: {
                    month: settlementForm.month,
                    year: settlementForm.year,
                    amount,
                    branch_id: Number(settlementForm.branch_id),
                    payment_date: settlementForm.payment_date,
                    due_date: settlementForm.due_date || null,
                    status: 'paid',
                    payment_method_id: settlementForm.payment_method_id ? Number(settlementForm.payment_method_id) : null,
                    affects_cash_balance: settlementForm.affects_cash_balance,
                    description: settlementForm.description || null,
                }
            })

            sileo.success({ title: 'Liquidación registrada correctamente' })
            dispatchExpensesChanged()
            setSettlementDialogOpen(false)
            setEmployeeToSettle(null)
            fetchEmployees(currentPage)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string }
            sileo.error({ title: err?.response?.data?.message || err?.message || 'No se pudo registrar la liquidación' })
        } finally {
            setSettlementLoading(false)
        }
    }

    const loadSettlementHistory = async (employee: Employee, month = historyMonth, year = historyYear) => {
        try {
            setHistoryLoading(true)
            const response = await request({
                method: 'GET',
                url: `/employees/${employee.id}/settlements`,
                params: {
                    month,
                    year,
                    per_page: 100,
                }
            })

            if (response?.success) {
                setSettlementHistory(response.data || [])
            }
        } catch (error) {
            console.error('Error loading settlement history', error)
            sileo.error({ title: 'No se pudo cargar el historial de liquidaciones' })
            setSettlementHistory([])
        } finally {
            setHistoryLoading(false)
        }
    }

    const openHistoryDialog = (employee: Employee) => {
        setHistoryEmployee(employee)
        setHistoryMonth(selectedMonth)
        setHistoryYear(selectedYear)
        setHistoryDialogOpen(true)
        loadSettlementHistory(employee, selectedMonth, selectedYear)
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: "bg-green-100 text-green-800 hover:bg-green-100",
            inactive: "bg-gray-100 text-gray-800 hover:bg-gray-100",
            terminated: "bg-red-100 text-red-800 hover:bg-red-100",
        };
        const labels: Record<string, string> = {
            active: "Activo",
            inactive: "Inactivo",
            terminated: "Terminado",
        };
        return (
            <Badge variant="outline" className={styles[status] || ""}>
                {labels[status] || status}
            </Badge>
        );
    };

    const getSettlementStatusBadge = (status: SettlementHistoryItem['status']) => {
        const styles: Record<SettlementHistoryItem['status'], string> = {
            pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            approved: "bg-blue-100 text-blue-800 hover:bg-blue-100",
            paid: "bg-green-100 text-green-800 hover:bg-green-100",
            cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
        };

        const labels: Record<SettlementHistoryItem['status'], string> = {
            pending: "Pendiente",
            approved: "Aprobado",
            paid: "Pagado",
            cancelled: "Cancelado",
        };

        return (
            <Badge variant="outline" className={styles[status]}>
                {labels[status]}
            </Badge>
        );
    }

    const settlementBranchOptions = getSettlementBranchOptions(employeeToSettle)
    const usesFallbackSettlementBranches = employeeToSettle
        ? !hasAssignedActiveSettlementBranch(employeeToSettle) && settlementBranchOptions.length > 0
        : false

    return (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Empleados</h2>
                    <p className="text-muted-foreground">
                        Gestión de personal{periodLabel ? ` • Liquidaciones de ${periodLabel}` : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchEmployees(currentPage)} disabled={loading} title="Refrescar">
                        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    {hasPermission('crear_empleados') && (
                        <Button onClick={() => setNewDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Empleado
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar empleados..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => {
                            setSelectedMonth(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map((month) => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        min={2000}
                        max={2100}
                        className="w-28"
                        value={selectedYear}
                        onChange={(e) => {
                            const rawValue = Number(e.target.value);
                            if (Number.isNaN(rawValue)) return;
                            setSelectedYear(Math.max(2000, Math.min(2100, rawValue)));
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            {loading && employees.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando empleados...
                </div>
            ) : (
                <div className="rounded-md border bg-card">
                    {employees.length > 0 ? (
                        <div className="relative">
                            <Table ref={tableRef} className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <ResizableTableHeader columnId="name" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Nombre</ResizableTableHeader>
                                        <ResizableTableHeader columnId="job_title" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Cargo</ResizableTableHeader>
                                        <ResizableTableHeader columnId="salary" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Salario</ResizableTableHeader>
                                        <ResizableTableHeader columnId="monthly_settlement" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Liquidado Mes</ResizableTableHeader>
                                        <ResizableTableHeader columnId="hire_date" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Fecha Contratación</ResizableTableHeader>
                                        <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Estado</ResizableTableHeader>
                                        <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-right">Acciones</ResizableTableHeader>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <ResizableTableCell columnId="name" getColumnCellProps={getColumnCellProps}>
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-medium">{employee.person?.first_name} {employee.person?.last_name}</div>
                                                        <div className="text-xs text-muted-foreground">{employee.person?.email || employee.person?.phone || '-'}</div>
                                                    </div>
                                                    {employee.user_id && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Link2 className="h-3 w-3 mr-1" />
                                                            Usuario
                                                        </Badge>
                                                    )}
                                                </div>
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="job_title" getColumnCellProps={getColumnCellProps}>
                                                {employee.job_title || '-'}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="salary" getColumnCellProps={getColumnCellProps}>
                                                ${Number(employee.salary).toLocaleString()}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="monthly_settlement" getColumnCellProps={getColumnCellProps}>
                                                ${Number(employee.monthly_settlement_amount ?? 0).toLocaleString()}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="hire_date" getColumnCellProps={getColumnCellProps}>
                                                {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="status" getColumnCellProps={getColumnCellProps}>
                                                {getStatusBadge(employee.status)}
                                            </ResizableTableCell>
                                            <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {hasPermission('ver_empleados') && (
                                                        <Button variant="ghost" size="icon" title="Ver Detalles" className="hover:bg-blue-100 group" onClick={() => handleViewClick(employee)}>
                                                            <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('editar_empleados') && (
                                                        <Button variant="ghost" size="icon" title="Editar" className="hover:bg-orange-100 group" onClick={() => handleEditClick(employee)}>
                                                            <Pencil className="h-4 w-4 text-orange-600 group-hover:text-orange-700" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('ver_empleados') && (
                                                        <Button variant="ghost" size="icon" title="Historial de Liquidaciones" className="hover:bg-indigo-100 group" onClick={() => openHistoryDialog(employee)}>
                                                            <History className="h-4 w-4 text-indigo-600 group-hover:text-indigo-700" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('crear_gastos') && (
                                                        <Button variant="ghost" size="icon" title="Liquidar Sueldo" className="hover:bg-emerald-100 group" onClick={() => openSettlementDialog(employee)}>
                                                            <Plus className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700" />
                                                        </Button>
                                                    )}
                                                    {employee.user_id && hasPermission('ver_usuarios') && (
                                                        <Button variant="ghost" size="icon" title="Ver Usuario Vinculado" className="hover:bg-green-100 group" asChild>
                                                            <Link to={`/dashboard/usuarios?filter=${encodeURIComponent(employee.person?.first_name + ' ' + employee.person?.last_name)}`}>
                                                                <User className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {hasPermission('eliminar_empleados') && (
                                                        <Button variant="ghost" size="icon" title="Eliminar" className="hover:bg-red-100 group" onClick={() => handleDeleteClick(employee.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
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
                        <div className="p-8 text-center text-muted-foreground">No hay empleados registrados</div>
                    )}
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                lastPage={totalPages}
                total={totalItems}
                itemName="empleados"
                onPageChange={setCurrentPage}
                disabled={loading}
                className="mt-4 mb-6"
            />

            {/* New Employee Dialog */}
            <NewEmployeeDialog
                open={newDialogOpen}
                onOpenChange={setNewDialogOpen}
                onSuccess={handleDialogSuccess}
            />

            {/* Edit Employee Dialog */}
            <EditEmployeeDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                employee={selectedEmployee}
                onSuccess={handleDialogSuccess}
                viewOnly={viewOnlyMode}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El empleado será eliminado permanentemente.
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

            <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Liquidar Sueldo</DialogTitle>
                        <DialogDescription>
                            {employeeToSettle ? `Registrar liquidación para ${employeeToSettle.person?.first_name} ${employeeToSettle.person?.last_name}` : 'Registrar liquidación'}
                        </DialogDescription>
                        <p className="text-xs text-muted-foreground">
                            Puedes registrar más de una liquidación en el mismo mes (por ejemplo, comisiones o bonos).
                        </p>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-2">
                        <div className="space-y-2">
                            <Label>Mes</Label>
                            <Select
                                value={settlementForm.month.toString()}
                                onValueChange={(value) => setSettlementForm(prev => ({ ...prev, month: Number(value) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((month) => (
                                        <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Año</Label>
                            <Input
                                type="number"
                                min={2000}
                                max={2100}
                                value={settlementForm.year}
                                onChange={(e) => setSettlementForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={settlementForm.amount}
                                onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sucursal</Label>
                            <Select
                                value={settlementForm.branch_id || 'none'}
                                onValueChange={(value) => setSettlementForm(prev => ({ ...prev, branch_id: value === 'none' ? '' : value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Seleccionar sucursal</SelectItem>
                                    {settlementBranchOptions
                                        .map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {getBranchDescription(
                                                    Number(branch.id),
                                                    typeof branch.description === 'string' ? branch.description : undefined,
                                                    employeeToSettle
                                                )}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {usesFallbackSettlementBranches && (
                                <p className="text-xs text-amber-700">
                                    Este empleado no tiene sucursal activa asignada. Se muestran sucursales activas generales para completar la liquidacion.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de Pago</Label>
                            <Input
                                type="date"
                                value={settlementForm.payment_date}
                                onChange={(e) => setSettlementForm(prev => ({ ...prev, payment_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vencimiento (opcional)</Label>
                            <Input
                                type="date"
                                value={settlementForm.due_date}
                                onChange={(e) => setSettlementForm(prev => ({ ...prev, due_date: e.target.value }))}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Descripción (opcional)</Label>
                            <Input
                                placeholder="Liquidación sueldo..."
                                value={settlementForm.description}
                                onChange={(e) => setSettlementForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Medio de Pago</Label>
                            <Select
                                value={settlementForm.payment_method_id || 'none'}
                                onValueChange={(value) => {
                                    const paymentMethodId = value === 'none' ? '' : value;
                                    setSettlementForm(prev => ({
                                        ...prev,
                                        payment_method_id: paymentMethodId,
                                    }));
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar medio de pago" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin seleccionar</SelectItem>
                                    {paymentMethods.map((method) => (
                                        <SelectItem key={method.id} value={method.id.toString()}>{method.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Campo obligatorio. La liquidación se registra siempre como pagada.</p>
                        </div>

                        <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
                            <div>
                                <p className="text-sm font-medium">Afectar balance de caja</p>
                                <p className="text-xs text-muted-foreground">Si se desactiva, se registra en caja pero no impacta el balance.</p>
                            </div>
                            <Switch
                                checked={settlementForm.affects_cash_balance}
                                onCheckedChange={(checked) => setSettlementForm(prev => ({ ...prev, affects_cash_balance: checked }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettlementDialogOpen(false)} disabled={settlementLoading}>Cancelar</Button>
                        <Button onClick={submitSettlement} disabled={settlementLoading}>
                            {settlementLoading ? 'Guardando...' : 'Registrar Liquidación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Historial de Liquidaciones</DialogTitle>
                        <DialogDescription>
                            {historyEmployee
                                ? `Liquidaciones de ${historyEmployee.person?.first_name} ${historyEmployee.person?.last_name}`
                                : 'Liquidaciones del empleado'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap items-end gap-3 py-2">
                        <div className="space-y-2">
                            <Label>Mes</Label>
                            <Select
                                value={historyMonth.toString()}
                                onValueChange={(value) => setHistoryMonth(Number(value))}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Seleccionar mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((month) => (
                                        <SelectItem key={month.value} value={month.value.toString()}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Año</Label>
                            <Input
                                type="number"
                                min={2000}
                                max={2100}
                                className="w-28"
                                value={historyYear}
                                onChange={(e) => setHistoryYear(Number(e.target.value))}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (!historyEmployee) return;
                                loadSettlementHistory(historyEmployee, historyMonth, historyYear)
                            }}
                            disabled={historyLoading || !historyEmployee}
                        >
                            {historyLoading ? 'Filtrando...' : 'Filtrar'}
                        </Button>
                    </div>

                    <div className="max-h-[420px] overflow-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Impacta Caja</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyLoading ? (
                                    <TableRow>
                                        <TableCell className="text-center py-6" colSpan={5}>
                                            Cargando historial...
                                        </TableCell>
                                    </TableRow>
                                ) : settlementHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="text-center py-6" colSpan={5}>
                                            No hay liquidaciones para este período.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    settlementHistory.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {new Date(item.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {item.description || item.category?.name || 'Liquidación'}
                                            </TableCell>
                                            <TableCell>
                                                ${Number(item.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {getSettlementStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell>
                                                {(item.affects_cash_balance ?? true) ? 'Sí' : 'No'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

