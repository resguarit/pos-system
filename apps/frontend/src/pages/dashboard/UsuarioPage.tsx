import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RotateCw, Search, Shield, Eye, Pencil, Trash2, UserCheck, ShoppingBag, BarChart3 } from "lucide-react"
import { useEffect, useState, useCallback } from "react" 
import useApi from "@/hooks/useApi"
import { useAuth } from "@/hooks/useAuth"
import { Link } from "react-router-dom"
import Pagination from "@/components/ui/pagination"
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
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  role: { id: string; name: string } | string
  active: boolean
  person?: {
    first_name: string
    last_name: string
  }
  branches?: Array<{
    id: string
    description: string
    color?: string
  }>
  last_login_at?: string // Agregado para el último acceso
  // Puedes agregar más campos según tu modelo
}

interface Role {
  id: string;
  name: string;
}

export default function UsuariosPage() {
  const { request, loading } = useApi()
  const { hasPermission } = useAuth()

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'name', minWidth: 120, maxWidth: 400, defaultWidth: 200 },
    { id: 'email', minWidth: 150, maxWidth: 350, defaultWidth: 200 },
    { id: 'role', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'branches', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
    { id: 'last_login', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'usuarios-column-widths',
    defaultWidth: 150
  });
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 10

  const fetchUsers = useCallback(async (page = 1, signal?: AbortSignal) => {
    try {
      const params: any = {
        page: page,
        limit: PAGE_SIZE
      };

      // Agregar filtros si están definidos
      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      if (selectedRole !== "all") {
        params.role_id = selectedRole;
      }
      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      const response = await request({
        method: "GET",
        url: "/users?include=branches,person,role",
        params,
        signal
      })
      
      // Manejar respuesta paginada
      if (response?.data) {
        const usersData = Array.isArray(response.data) ? response.data : response.data.data || []
        setUsers(usersData)
        setTotalItems(response.total || response.data.total || usersData.length)
        setCurrentPage(response.current_page || response.data.current_page || page)
        setTotalPages(response.last_page || response.data.last_page || Math.ceil((response.total || usersData.length) / PAGE_SIZE))
      } else {
        const usersData = Array.isArray(response) ? response : []
        setUsers(usersData)
        setTotalItems(usersData.length)
        setCurrentPage(1)
        setTotalPages(1)
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
      } else if (!signal?.aborted) {
        console.error("Error fetching users:", error)
        setUsers([])
        setTotalItems(0)
        setTotalPages(1)
      }
    }
  }, [request, PAGE_SIZE, searchText, selectedRole, selectedStatus]);

  const fetchRoles = useCallback(async (signal?: AbortSignal) => { // Added signal and useCallback
    try {
      const response = await request({ method: "GET", url: "/roles", signal }); // Pass signal
      if (!signal?.aborted) {
        setRoles(Array.isArray(response) ? response : response?.data ? response.data : []);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
      } else if (!signal?.aborted) {
        setRoles([]);
        // toast.error("Error al cargar roles");
      }
    }
  }, [request]); // Added dependency

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(1, controller.signal);
    fetchRoles(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchUsers, fetchRoles]);

  // Efecto separado para recargar cuando cambien los filtros
  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(1, controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchUsers]);

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    // Verificar permiso antes de eliminar
    if (!hasPermission('eliminar_usuarios')) {
      toast.error("Sin permisos", {
        description: "No tienes permisos para eliminar usuarios",
      })
      return
    }

    try {
      // Petición real al backend:
      await request({
        method: "DELETE",
        url: `/users/${userToDelete}`,
      });

      setUsers(users.filter((user) => user.id !== userToDelete))

      toast.success("Usuario eliminado", {
        description: "El usuario ha sido eliminado correctamente",
      })
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo eliminar el usuario",
      })
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }


  // Funciones de paginación
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
      setCurrentPage(pageNumber);
      fetchUsers(pageNumber);
    }
  };


  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Usuarios del Sistema</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchUsers(currentPage)} disabled={loading} title="Refrescar" className="cursor-pointer">
            <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>
          {hasPermission('crear_usuarios') && (
            <Button asChild className="cursor-pointer">
              <Link to="/dashboard/usuarios/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar usuarios..." className="w-full pl-8" value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando usuarios...
        </div>
      ) : (
        <div className="rounded-md border">
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <ResizableTableHeader
                  columnId="name"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  Nombre Completo
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="email"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  Email
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="role"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  Rol
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="status"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  Estado
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="branches"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  Sucursales
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="last_login"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  Último acceso
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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No hay usuarios
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <ResizableTableCell
                      columnId="name"
                      getColumnCellProps={getColumnCellProps}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {user.person?.first_name ? user.person.first_name[0] : "U"}
                        </div>
                        <span className="truncate" title={`${user.person?.first_name || ""} ${user.person?.last_name || ""}`}>
                          {`${user.person?.first_name || ""} ${user.person?.last_name || ""}`.trim() || "Sin nombre"}
                        </span>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="email"
                      getColumnCellProps={getColumnCellProps}
                    >
                      <span className="truncate" title={user.email}>
                        {user.email}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="role"
                      getColumnCellProps={getColumnCellProps}
                    >
                      {(() => {
                        const roleName = typeof user.role === "string" ? user.role : user.role?.name || ""
                        let badgeClass = ""
                        let icon = <Shield className="mr-1 h-3 w-3" />
                        if (roleName.toLowerCase() === "administrador") {
                          badgeClass = "bg-purple-100 text-purple-800"
                          icon = <Shield className="mr-1 h-3 w-3" />
                        } else if (roleName.toLowerCase() === "supervisor") {
                          badgeClass = "bg-green-100 text-green-800"
                          icon = <UserCheck className="mr-1 h-3 w-3" />
                        } else if (roleName.toLowerCase() === "vendedor") {
                          badgeClass = "bg-orange-100 text-orange-800"
                          icon = <ShoppingBag className="mr-1 h-3 w-3" />
                        } else {
                          badgeClass = "bg-blue-100 text-blue-800"
                          icon = <Shield className="mr-1 h-3 w-3" />
                        }
                        return (
                          <Badge className={badgeClass + " hover:bg-opacity-90 truncate"} title={roleName}>
                            {icon}
                            {roleName}
                          </Badge>
                        )
                      })()}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="status"
                      getColumnCellProps={getColumnCellProps}
                    >
                      <Badge
                        variant="outline"
                        className={user.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="branches"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell"
                    >
                      {user.branches && user.branches.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {user.branches.slice(0, 2).map((branch) => (
                            <div key={branch.id} className="flex items-center">
                              <span 
                                className="mr-2 h-2 w-2 rounded-full" 
                                style={{ backgroundColor: branch.color || '#0ea5e9' }}
                              ></span>
                              <span className="text-sm truncate" title={branch.description}>{branch.description}</span>
                            </div>
                          ))}
                          {user.branches.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{user.branches.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin sucursal</span>
                      )}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="last_login"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell"
                    >
                      <span className="truncate" title={user.last_login_at ? new Date(user.last_login_at).toLocaleString('es-AR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : "Nunca"}>
                        {user.last_login_at ? (
                          new Date(user.last_login_at).toLocaleString('es-AR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="actions"
                      getColumnCellProps={getColumnCellProps}
                      className="text-right"
                    >
                      <div className="flex justify-end gap-1">
                        {hasPermission('ver_usuarios') && (
                          <Button variant="ghost" size="icon" title="Ver" className="hover:bg-blue-100 group cursor-pointer" asChild>
                            <Link to={`/dashboard/usuarios/${user.id}/ver`}>
                              <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                            </Link>
                          </Button>
                        )}
                        {hasPermission('ver_estadisticas_usuario') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver Desempeño"
                            className="hover:bg-emerald-100 group cursor-pointer"
                            asChild
                          >
                            <Link 
                              to={`/dashboard/usuarios/${user.id}/desempeno`}
                            >
                              <BarChart3 className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700" />
                            </Link>
                          </Button>
                        )}
                        {hasPermission('editar_usuarios') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 cursor-pointer"
                            asChild
                          >
                            <Link to={`/dashboard/usuarios/${user.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {hasPermission('eliminar_usuarios') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            className="hover:bg-red-100 group cursor-pointer"
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                          </Button>
                        )}
                      </div>
                    </ResizableTableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginación para usuarios */}
      <Pagination
        currentPage={currentPage}
        lastPage={totalPages}
        total={totalItems}
        itemName="usuarios"
        onPageChange={(page) => goToPage(page)}
        disabled={loading}
        className="mt-4 mb-6"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
