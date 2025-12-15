import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Search, Plus, RotateCw as RefreshIcon, Eye, Pencil, BarChart2, Trash2, Users } from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import Pagination from "@/components/ui/pagination"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
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
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { BranchPersonnelModal } from "@/components/branches/BranchPersonnelModal"

interface Branch {
  id: string;
  description: string;
  address: string;
  phone: string;
  status: boolean;
  color: string;
  manager_id: number | null;
  manager?: { person: { first_name: string; last_name: string } } | null;
  employees_count?: number;
}

export default function SucursalesPage() {
  const { request } = useApi();
  const { hasPermission } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'address', minWidth: 200, maxWidth: 350, defaultWidth: 250 },
    { id: 'phone', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'manager', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
    { id: 'users', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'actions', minWidth: 150, maxWidth: 200, defaultWidth: 170 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'sucursales-column-widths',
    defaultWidth: 150
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);

  const [personnelModal, setPersonnelModal] = useState<{ isOpen: boolean; branchId: string | null; branchName: string | null }>({
    isOpen: false,
    branchId: null,
    branchName: null,
  });

  const navigate = useNavigate();
  const { dispatch } = useEntityContext();

  const [branchesLoading, setBranchesLoading] = useState(true);

  const fetchBranches = useCallback(async (signal?: AbortSignal) => {
    setBranchesLoading(true);
    try {
      const response = await request({ method: "GET", url: "/branches", signal });

      // La respuesta puede estar en response.data.data (paginada), response.data o ser el array directamente
      const fetchedBranches: Branch[] = Array.isArray(response?.data?.data) ? response.data.data :
        Array.isArray(response?.data) ? response.data :
          Array.isArray(response) ? response : [];

      if (!Array.isArray(fetchedBranches)) {
        console.warn("La respuesta de sucursales no es un array:", fetchedBranches);
        // Si después de verificar, sigue sin ser un array, lo tratamos como vacío para evitar crashes.
        setBranches([]);
      } else {
        setBranches(fetchedBranches);
        if (fetchedBranches.length > 0 && !signal?.aborted) {
          dispatch({ type: "SET_ENTITIES", entityType: "branches", entities: fetchedBranches });
        }
      }

    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      // Toast de error removido para evitar notificaciones falsas
      setBranches([]); // Limpiamos por si había datos previos
    } finally {
      if (!signal?.aborted) {
        setBranchesLoading(false);
      }
    }
  }, [request, dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBranches(controller.signal);
    return () => controller.abort();
  }, [fetchBranches]);

  const handleDeleteClick = (id: string) => {
    setBranchToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      await request({
        method: "DELETE",
        url: `/branches/${branchToDelete}`,
      });
      setBranches((prev) => prev.filter((branch) => branch.id !== branchToDelete));
      toast.success("Sucursal eliminada");
    } catch (error: any) {
      toast.error("Error al eliminar", {
        description: error?.response?.data?.message || "No se pudo eliminar la sucursal.",
      });
    } finally {
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  const filteredBranches = branches.filter(
    (branch) =>
      branch.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(branch.id).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Paginación client-side
  const paginatedBranches = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredBranches.slice(startIndex, endIndex);
  }, [filteredBranches, currentPage, perPage]);

  const totalPages = Math.ceil(filteredBranches.length / perPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredBranchesToDisplay = paginatedBranches;

  const handleViewBranch = (id: string) => navigate(`/dashboard/sucursales/${id}/ver`);
  const handleEditBranch = (id: string) => navigate(`/dashboard/sucursales/${id}/editar`);
  const handleSalesHistory = (id: string) => navigate(`/dashboard/sucursales/${id}/ventas`);

  const handleViewPersonnel = (branch: Branch) => {
    setPersonnelModal({
      isOpen: true,
      branchId: branch.id,
      branchName: branch.description,
    });
  };

  return (
    <ProtectedRoute permissions={['ver_sucursales']} requireAny={true}>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Sucursales</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchBranches()} disabled={branchesLoading} title="Refrescar Lista" className="cursor-pointer">
              <RefreshIcon className={branchesLoading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
            </Button>
            {hasPermission('crear_sucursales') && (
              <Button variant="default" onClick={() => navigate("/dashboard/sucursales/nuevo")} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" /> Nueva sucursal
              </Button>
            )}
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por ID, nombre o dirección..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {branchesLoading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">Cargando sucursales...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {searchTerm ? "No se encontraron sucursales." : "No hay sucursales para mostrar."}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader columnId="name" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descripción</ResizableTableHeader>
                  <ResizableTableHeader columnId="address" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="hidden md:table-cell">Dirección</ResizableTableHeader>
                  <ResizableTableHeader columnId="phone" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="hidden lg:table-cell">Teléfono</ResizableTableHeader>
                  <ResizableTableHeader columnId="manager" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="hidden lg:table-cell">Encargado</ResizableTableHeader>
                  <ResizableTableHeader columnId="users" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center hidden sm:table-cell">Personal</ResizableTableHeader>
                  <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="hidden sm:table-cell">Estado</ResizableTableHeader>
                  <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-right">Acciones</ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranchesToDisplay.map((branchItem) => {
                  const getStatusBadge = (status: boolean) => {
                    if (status) return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Activa</Badge>;
                    return <Badge variant="destructive" className="bg-red-200 text-red-700 border-red-300">Inactiva</Badge>;
                  };

                  return (
                    <TableRow key={branchItem.id} className="hover:bg-muted/50">
                      <ResizableTableCell columnId="name" getColumnCellProps={getColumnCellProps}>
                        <div className="flex items-center">
                          <span className="inline-block h-3 w-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: branchItem.color }} />
                          <span className="font-medium truncate" title={branchItem.description}>{branchItem.description}</span>
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="address" getColumnCellProps={getColumnCellProps} className="hidden md:table-cell">
                        <span className="truncate" title={branchItem.address}>{branchItem.address}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="phone" getColumnCellProps={getColumnCellProps} className="hidden lg:table-cell">
                        <span className="truncate" title={branchItem.phone || "N/A"}>{branchItem.phone || "N/A"}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="manager" getColumnCellProps={getColumnCellProps} className="hidden lg:table-cell">
                        <span className="truncate" title={branchItem.manager ? `${branchItem.manager.person.first_name} ${branchItem.manager.person.last_name}` : "N/A"}>
                          {branchItem.manager ? `${branchItem.manager.person.first_name} ${branchItem.manager.person.last_name}` : "N/A"}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="users" getColumnCellProps={getColumnCellProps} className="text-center hidden sm:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={hasPermission('ver_personal_sucursal') ? () => handleViewPersonnel(branchItem) : undefined}
                          className={`font-medium text-teal-600 ${hasPermission('ver_personal_sucursal') ? 'hover:text-teal-700 hover:bg-teal-50 cursor-pointer' : 'cursor-default hover:bg-transparent'}`}
                          disabled={!hasPermission('ver_personal_sucursal')}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {branchItem.employees_count ?? 0}
                        </Button>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="status" getColumnCellProps={getColumnCellProps} className="hidden sm:table-cell">
                        {getStatusBadge(branchItem.status)}
                      </ResizableTableCell>
                      <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('ver_sucursales') && (
                            <Button variant="ghost" size="icon" onClick={() => handleViewBranch(branchItem.id)} title="Ver Detalles" className="text-blue-600 hover:bg-blue-100 hover:text-blue-800 cursor-pointer">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('editar_sucursales') && (
                            <Button variant="ghost" size="icon" onClick={() => handleEditBranch(branchItem.id)} title="Editar" className="text-orange-600 hover:bg-orange-100 hover:text-orange-700 cursor-pointer">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('ver_historial_ventas_sucursal') && (
                            <Button variant="ghost" size="icon" onClick={() => handleSalesHistory(branchItem.id)} title="Historial de Ventas" className="text-purple-600 hover:bg-purple-100 hover:text-purple-700 cursor-pointer">
                              <BarChart2 className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('eliminar_sucursales') && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(branchItem.id)} title="Eliminar" className="text-red-600 hover:bg-red-100 hover:text-red-700 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </ResizableTableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación */}
        {!branchesLoading && filteredBranches.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            lastPage={totalPages}
            total={filteredBranches.length}
            itemName="sucursales"
            onPageChange={handlePageChange}
            disabled={branchesLoading}
          />
        )}

        <BranchPersonnelModal
          isOpen={personnelModal.isOpen}
          onClose={() => setPersonnelModal({ isOpen: false, branchId: null, branchName: null })}
          branchId={personnelModal.branchId}
          branchName={personnelModal.branchName}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará la sucursal como eliminada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 cursor-pointer">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
