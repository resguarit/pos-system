import { useState, useEffect, useCallback } from "react" 
import { useEntityContext } from "@/context/EntityContext"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Eye, Pencil, Trash2, RotateCw, BarChart2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditCustomerDialog } from "@/components/edit-customer-dialog"
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
import { Plus } from "lucide-react"

// Tipo para el cliente
interface Customer {
  id: number;
  person_id: number;
  email: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  person: {
    id: number;
    last_name: string;
    first_name: string;
    address: string;
    phone: string;
    cuit: string;
    fiscal_condition_id: number;
    person_type_id: number;
    credit_limit: number;
    person_type: string;
    document_type_id: number | null;
    documento: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
}

export default function ClientesPage() {
  const { request, loading, error } = useApi();
  const { dispatch } = useEntityContext();
  const { hasPermission } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null)
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [allCustomers, setAllCustomers] = useState<any[]>([]) // Para paginación del cliente
  const PAGE_SIZE = 10

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'email', minWidth: 180, maxWidth: 350, defaultWidth: 220 },
    { id: 'cuit', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'phone', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
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
    storageKey: 'clientes-column-widths',
    defaultWidth: 150
  });

  // Debounce para el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Resetear a la primera página cuando cambie la búsqueda
      setCurrentPage(1);
      setAllCustomers([]); // Limpiar caché al cambiar búsqueda
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const fetchCustomers = useCallback(async (page = 1, signal?: AbortSignal) => {
    try {
      // Para la primera carga o cuando no tenemos datos en caché
      const shouldFetchFromAPI = page === 1 || allCustomers.length === 0;
      
      if (shouldFetchFromAPI) {
        const params: any = {};

        // Agregar filtro de búsqueda si está definido
        if (debouncedSearchTerm.trim()) {
          params.search = debouncedSearchTerm.trim();
        }


        const response = await request({ 
          method: "GET", 
          url: "/customers",
          params,
          signal 
        });
        
        if (response && response.success) {
          const customersData = Array.isArray(response.data) ? response.data : response.data?.data || []
          
          // Verificar si la API tiene paginación del servidor útil
          const hasServerPagination = (response.total !== undefined || response.data?.total !== undefined) && 
                                     (response.last_page > 1 || response.data?.last_page > 1);
          
          if (hasServerPagination) {
            // Usar paginación del servidor
            setCustomers(customersData);
            setTotalItems(response.total || response.data?.total || customersData.length)
            setCurrentPage(response.current_page || response.data?.current_page || page)
            setTotalPages(response.last_page || response.data?.last_page || Math.ceil((response.total || customersData.length) / PAGE_SIZE))
          } else {
            // Usar paginación del cliente
            setAllCustomers(customersData);
            
            // Calcular paginación del cliente
            const totalCount = customersData.length;
            const totalPagesCalculated = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
            const safeCurrentPage = Math.min(page, totalPagesCalculated);
            const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
            const endIndex = startIndex + PAGE_SIZE;
            const paginatedCustomers = customersData.slice(startIndex, endIndex);
            
            setCustomers(paginatedCustomers);
            setTotalItems(totalCount);
            setCurrentPage(safeCurrentPage);
            setTotalPages(totalPagesCalculated);
          }
          
          // Actualizar el context con todos los clientes (no paginados)
          const allCustomersForContext = hasServerPagination ? customersData : customersData;
          dispatch({ 
            type: 'SET_ENTITIES', 
            entityType: 'customers', 
            entities: allCustomersForContext 
          });
        }
      } else {
        // Usar datos en caché para paginación del cliente
        const totalCount = allCustomers.length;
        const totalPagesCalculated = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        const safeCurrentPage = Math.min(page, totalPagesCalculated);
        const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedCustomers = allCustomers.slice(startIndex, endIndex);
        
        setCustomers(paginatedCustomers);
        setCurrentPage(safeCurrentPage);
        setTotalPages(totalPagesCalculated);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
      } else if (!signal?.aborted) {
        setCustomers([]);
        setTotalItems(0)
        setTotalPages(1)
      }
    }
  }, [request, dispatch, PAGE_SIZE, debouncedSearchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(1, controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchCustomers]); // Usar fetchCustomers como dependencia

  const handleDeleteClick = (customerId: number) => {
    setCustomerToDelete(customerId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return
    
    if (!hasPermission('eliminar_clientes')) {
      toast.error('No tienes permisos para eliminar clientes');
      return;
    }
    
    try {
      await request({ method: "DELETE", url: `/customers/${customerToDelete}` })
      setCustomers(customers.filter((customer) => customer.id !== customerToDelete))
      toast.success('Cliente eliminado correctamente')
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al eliminar el cliente'
      toast.error(errorMessage)
      // Solo cerrar el diálogo si fue un error que no es de deuda
      if (error?.response?.status !== 409) {
        setDeleteDialogOpen(false)
        setCustomerToDelete(null)
      }
    }
  }

  // Funciones de paginación
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
      setCurrentPage(pageNumber);
      fetchCustomers(pageNumber);
    }
  };


  return (
    <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchCustomers()} disabled={loading} title="Refrescar">
            <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>
          {hasPermission('crear_clientes') && (
            <Button asChild>
              <Link to="/dashboard/clientes/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Link>
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
              placeholder="Buscar clientes..." 
              className="w-full pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando clientes...
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          {customers.length > 0 ? (
            <div className="relative">
              <Table ref={tableRef} className="w-full">
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
                      columnId="email"
                      getResizeHandleProps={getResizeHandleProps}
                      getColumnHeaderProps={getColumnHeaderProps}
                      className="hidden md:table-cell"
                    >
                      Email
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnId="cuit"
                      getResizeHandleProps={getResizeHandleProps}
                      getColumnHeaderProps={getColumnHeaderProps}
                      className="hidden md:table-cell"
                    >
                      CUIT/DNI
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnId="phone"
                      getResizeHandleProps={getResizeHandleProps}
                      getColumnHeaderProps={getColumnHeaderProps}
                      className="hidden md:table-cell"
                    >
                      Teléfono
                    </ResizableTableHeader>
                    <ResizableTableHeader
                      columnId="status"
                      getResizeHandleProps={getResizeHandleProps}
                      getColumnHeaderProps={getColumnHeaderProps}
                    >
                      Estado
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
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <ResizableTableCell
                        columnId="name"
                        getColumnCellProps={getColumnCellProps}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {customer.person.first_name ? customer.person.first_name[0] : "C"}
                          </div>
                          <span className="truncate" title={`${customer.person.first_name} ${customer.person.last_name}`}>
                            {`${customer.person.first_name} ${customer.person.last_name}`}
                          </span>
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="email"
                        getColumnCellProps={getColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        <div className="truncate" title={customer.email || '-'}>
                          {customer.email || '-'}
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="cuit"
                        getColumnCellProps={getColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        {customer.person.documento || customer.person.cuit || '-'}
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="phone"
                        getColumnCellProps={getColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        {customer.person.phone || '-'}
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="status"
                        getColumnCellProps={getColumnCellProps}
                      >
                        {customer.active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
                            Activo
                          </Badge>
                        ) : ( 
                          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
                            Inactivo
                          </Badge>
                        )}
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="actions"
                        getColumnCellProps={getColumnCellProps}
                        className="text-right"
                      >
                        <div className="flex justify-end gap-1">
                          {hasPermission('ver_clientes') && (
                            <Button variant="ghost" size="icon" title="Ver" className="hover:bg-blue-100 group">
                              <Link to={`/dashboard/clientes/${customer.id}/ver`}>
                                <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                              </Link>
                            </Button>
                          )}
                          {hasPermission('editar_clientes') && (
                            <Button variant="ghost" size="icon" title="Editar" className="hover:text-orange-700 hover:bg-orange-50">
                              <Link to={`/dashboard/clientes/${customer.id}/editar`}>
                              <Pencil className="h-4 w-4 text-orange-600 group-hover:text-orange-700" />
                            </Link>
                            </Button>
                          )}
                          {hasPermission('ver_clientes') && hasPermission('ver_ventas') && (
                             <Button variant="ghost" size="icon" title="Historial de Compras" className="hover:bg-purple-100 group">
                              <Link to={`/dashboard/clientes/${customer.id}/compras`}>
                              <BarChart2 className="h-4 w-4 text-purple-600 group-hover:text-purple-700" />
                              </Link>
                            </Button>
                          )}
                          {hasPermission('gestionar_cuentas_corrientes') && (
                             <Button variant="ghost" size="icon" title="Cuenta Corriente" className="hover:bg-green-100 group">
                              <Link to={`/dashboard/cuentas-corrientes?filter=${encodeURIComponent(customer.person.first_name + ' ' + customer.person.last_name)}`}>
                              <Wallet className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                              </Link>
                            </Button>
                          )}
                          {hasPermission('eliminar_clientes') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              className="hover:bg-red-100 group"
                              onClick={() => handleDeleteClick(customer.id)}
                            >
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
            <div className="p-4 text-center text-muted-foreground">No hay clientes</div>
          )}
        </div>
      )}
      {/* Paginación para clientes */}
      <Pagination
        currentPage={currentPage}
        lastPage={totalPages}
        total={totalItems}
        itemName="clientes"
        onPageChange={(page) => goToPage(page)}
        disabled={loading}
        className="mt-4 mb-6"
      />

      <EditCustomerDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        customer={{ 
          id: 0, 
          name: '', // <- nombre vacío para fallback
          email: '', 
          phone: '' // <- teléfono vacío para fallback
        }} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente del sistema.
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
