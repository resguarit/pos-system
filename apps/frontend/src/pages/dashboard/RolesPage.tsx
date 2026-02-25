import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Plus, RotateCw, Search, Eye, Pencil, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
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
import { sileo } from "sileo"
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext";
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/hooks/useAuth"
import Pagination from "@/components/ui/pagination"

// --- INICIO DE MODIFICACIÓN ---
// 1. Se importa la utilidad de estilos. La ruta asume que el archivo está en `src/lib`.
import { getRoleStyle } from "@/types/roles-styles"
// --- FIN DE MODIFICACIÓN ---

interface Role {
  id: string
  name: string
  description: string
  permissions_count: number
  isSystem: boolean
}

export default function RolesPage() {
  const { request, loading } = useApi()
  const { hasPermission } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null)
  const [search, setSearch] = useState("");
  const { dispatch } = useEntityContext();

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'name', minWidth: 200, maxWidth: 350, defaultWidth: 250 },
    { id: 'description', minWidth: 250, maxWidth: 500, defaultWidth: 350 },
    { id: 'permissions', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'roles-column-widths',
    defaultWidth: 150
  });

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 10


  const fetchRoles = async (page = 1) => {
    try {
      const params: any = {
        page: page,
        limit: PAGE_SIZE
      };

      // Agregar filtro de búsqueda si está definido
      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await request({ 
        method: "GET", 
        url: `/roles/permissions-count`,
        params
      })
      
      if (response && response.success) {
        const rolesData = Array.isArray(response.data) ? response.data : response.data?.data || []
        
        // Verificar si la API tiene paginación del servidor
        const hasServerPagination = (response.total !== undefined || response.data?.total !== undefined) && 
                                   (response.last_page > 1 || response.data?.last_page > 1);
        
        if (hasServerPagination) {
          // Usar paginación del servidor
          setRoles(rolesData);
          setTotalItems(response.total || response.data?.total || rolesData.length)
          setCurrentPage(response.current_page || response.data?.current_page || page)
          setTotalPages(response.last_page || response.data?.last_page || Math.ceil((response.total || rolesData.length) / PAGE_SIZE))
        } else {
          // Fallback: usar paginación del cliente
          const allRolesData = rolesData.map((role: any) => ({
            id: String(role.id),
            name: role.name,
            description: role.description || "",
            permissions_count: role.permissions_count || 0,
            isSystem: !!role.is_system,
          }));
          
          setRoles(allRolesData);
          setTotalItems(allRolesData.length);
          setCurrentPage(page);
          setTotalPages(Math.max(1, Math.ceil(allRolesData.length / PAGE_SIZE)));
        }
        
        dispatch({ type: 'SET_ENTITIES', entityType: 'roles', entities: rolesData });
      }
    } catch (error) {
      sileo.error({ title: "Error",
        description: "No se pudieron cargar los roles",
      })
    }
  }

  useEffect(() => {
    fetchRoles(1)
  }, [])

  // Efecto para recargar cuando cambie la búsqueda
  useEffect(() => {
    fetchRoles(1)
  }, [search])

  const handleDeleteClick = (roleId: string) => {
    setRoleToDelete(roleId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return

    if (!hasPermission('eliminar_roles')) {
      console.error('No tienes permisos para eliminar roles');
      return;
    }

    try {
      await request({ method: "DELETE", url: `/roles/${roleToDelete}`})
      setRoles(roles.filter((role) => role.id !== roleToDelete))
      dispatch({ type: 'REMOVE_ENTITY', entityType: 'roles', id: roleToDelete });
      sileo.success({ title: "Rol eliminado",
        description: "El rol ha sido eliminado correctamente",
      })
    } catch (error) {
      sileo.error({ title: "Error",
        description: "No se pudo eliminar el rol",
      })
    } finally {
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  };

  // Funciones de paginación
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
      setCurrentPage(pageNumber);
      fetchRoles(pageNumber);
    }
  };

  // Resetear página cuando cambie la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <ProtectedRoute permissions={['ver_roles']} requireAny={true}>
      <div className="w-full flex flex-col gap-4 p-4 md:p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Roles del Sistema</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchRoles(1)} disabled={loading} title="Refrescar">
              <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
            </Button>
            {hasPermission('crear_roles') && (
              <Button asChild>
                <Link to="/dashboard/roles/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Rol
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar roles..."
                className="w-full pl-8"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        {/* Table Section - Auto height */}
        <div className="rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando roles...
            </div>
          ) : (
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader
                    columnId="name"
                    getResizeHandleProps={getResizeHandleProps}
                    getColumnHeaderProps={getColumnHeaderProps}
                  >
                    Nombre
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="description"
                    getResizeHandleProps={getResizeHandleProps}
                    getColumnHeaderProps={getColumnHeaderProps}
                  >
                    Descripción
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="permissions"
                    getResizeHandleProps={getResizeHandleProps}
                    getColumnHeaderProps={getColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Permisos
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="actions"
                    getResizeHandleProps={getResizeHandleProps}
                    getColumnHeaderProps={getColumnHeaderProps}
                    className="text-center"
                  >
                    Acciones
                  </ResizableTableHeader>
                </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No hay roles
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => {
                      // --- INICIO DE MODIFICACIÓN ---
                      // 2. Se obtienen los estilos para el rol actual.
                      const RoleIcon = getRoleStyle(role.name).icon;
                      const roleColor = getRoleStyle(role.name).color;
                      // --- FIN DE MODIFICACIÓN ---
                      return (
                        <TableRow key={role.id}>
                          <ResizableTableCell
                            columnId="name"
                            getColumnCellProps={getColumnCellProps}
                          >
                            <div className={`flex items-center gap-2 font-medium ${roleColor}`}>
                              <RoleIcon className="h-4 w-4" />
                              <span className="truncate" title={role.name}>{role.name}</span>
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="description"
                            getColumnCellProps={getColumnCellProps}
                          >
                            <span className="truncate" title={role.description}>
                              {role.description}
                            </span>
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="permissions"
                            getColumnCellProps={getColumnCellProps}
                            className="hidden md:table-cell"
                          >
                            <span title={`${role.permissions_count} permisos`}>
                              {role.permissions_count} permisos
                            </span>
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="actions"
                            getColumnCellProps={getColumnCellProps}
                            className="text-right"
                          >
                            <div className="flex justify-center gap-1">
                              {hasPermission('ver_roles') && (
                                <Button variant="ghost" size="icon" title="Ver" className="hover:bg-blue-100 group" asChild>
                                  <Link to={`/dashboard/roles/${role.id}/ver`}>
                                    <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                                  </Link>
                                </Button>
                              )}
                              {hasPermission('editar_roles') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Editar"
                                  className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                  asChild
                                >
                                  <Link to={`/dashboard/roles/${role.id}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {hasPermission('eliminar_roles') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={role.name.toLowerCase() === 'admin' ? 'El rol Admin no puede ser eliminado' : 'Eliminar'}
                                  className="hover:bg-red-100 group"
                                  onClick={() => handleDeleteClick(role.id)}
                                  disabled={role.isSystem || role.name.toLowerCase() === 'admin'} // No permitir eliminar roles del sistema ni Admin
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                                </Button>
                              )}
                            </div>
                          </ResizableTableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
        </div>

        {/* Paginación para roles */}
        <Pagination
          currentPage={currentPage}
          lastPage={totalPages}
          total={totalItems}
          itemName="roles"
          onPageChange={(page) => goToPage(page)}
          disabled={loading}
        />

        {/* Alert Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El rol será eliminado permanentemente del sistema.
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
    </ProtectedRoute>
  )
}
