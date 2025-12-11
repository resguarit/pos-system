import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Pencil, Trash2, RotateCw, Plus, Link2, Eye, User } from "lucide-react"
import { Link } from "react-router-dom"
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
    status: 'active' | 'inactive' | 'terminated';
    hire_date: string;
}

export default function EmployeesPage() {
    const { request, loading } = useApi();
    const { hasPermission } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

    // Dialog states
    const [newDialogOpen, setNewDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [viewOnlyMode, setViewOnlyMode] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null)

    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const PAGE_SIZE = 10

    const columnConfig = [
        { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
        { id: 'job_title', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
        { id: 'salary', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
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
    }, [searchTerm]);

    const fetchEmployees = useCallback(async (page = 1) => {
        try {
            const params: any = { page, limit: PAGE_SIZE };
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
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
            toast.error("Error al cargar empleados");
        }
    }, [request, debouncedSearchTerm]);

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
            toast.success('Empleado eliminado correctamente')
            fetchEmployees(currentPage);
            setDeleteDialogOpen(false)
            setEmployeeToDelete(null)
        } catch (error: any) {
            toast.error(error?.message || 'Error al eliminar el empleado')
        }
    }

    const handleDialogSuccess = () => {
        fetchEmployees(currentPage);
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

    return (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Empleados</h2>
                    <p className="text-muted-foreground">Gestión de personal</p>
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
        </div>
    )
}

