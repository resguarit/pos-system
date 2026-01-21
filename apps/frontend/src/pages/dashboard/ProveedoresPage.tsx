import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Trash2, Pencil, Eye, Wallet } from "lucide-react"
import ProviderDialog from "@/components/provider-dialog"
import { DeleteSupplierDialog } from "@/components/delete-supplier-dialog"
import { ViewSupplierDialog } from "@/components/view-supplier-dialog";
import { SupplierCurrentAccountDetails } from "@/components/suppliers/SupplierCurrentAccountDetails";
import { getSupplierById } from "@/lib/api/supplierService"
import type { Supplier as SupplierType } from "@/types"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import useApi from "@/hooks/useApi"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import Pagination from "@/components/ui/pagination"

export default function ProveedoresPage() {
  const { hasPermission } = useAuth();
  const { request } = useApi();
  const [searchTerm, setSearchTerm] = useState("")

  // Configuración de columnas redimensionables para proveedores
  const supplierColumnConfig = [
    { id: 'name', minWidth: 100, maxWidth: 400, defaultWidth: 250 },
    { id: 'contact', minWidth: 100, maxWidth: 300, defaultWidth: 200 },
    { id: 'phone', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'balance', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
  ];

  const {
    getResizeHandleProps: getSupplierResizeHandleProps,
    getColumnHeaderProps: getSupplierColumnHeaderProps,
    getColumnCellProps: getSupplierColumnCellProps,
    tableRef: supplierTableRef
  } = useResizableColumns({
    columns: supplierColumnConfig,
    storageKey: 'proveedores-column-widths',
    defaultWidth: 150
  });

  const [openNewProvider, setOpenNewProvider] = useState(false)
  const [openEditProvider, setOpenEditProvider] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [currentAccountOpen, setCurrentAccountOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierType[]>([])
  const [loading, setLoading] = useState(false)

  // Estados de paginación para proveedores
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 8

  // Fetch suppliers from backend
  useEffect(() => {
    loadSuppliers(1)
  }, [])

  // Refetch cuando cambie el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadSuppliers(1);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const loadSuppliers = async (page = 1) => {
    setLoading(true)
    try {
      const params: any = {
        page: page,
        limit: PAGE_SIZE
      };

      // Agregar filtro de búsqueda si está definido
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await request({
        method: "GET",
        url: "/suppliers",
        params
      });

      if (response && response.success) {
        const suppliersData = Array.isArray(response.data) ? response.data : response.data?.data || []

        // Verificar si la API tiene paginación del servidor
        const hasServerPagination = (response.total !== undefined || response.data?.total !== undefined) &&
          (response.last_page > 1 || response.data?.last_page > 1);

        if (hasServerPagination) {
          // Usar paginación del servidor
          setSuppliers(suppliersData);
          setTotalItems(response.total || response.data?.total || suppliersData.length)
          setCurrentPage(response.current_page || response.data?.current_page || page)
          setTotalPages(response.last_page || response.data?.last_page || Math.ceil((response.total || suppliersData.length) / PAGE_SIZE))
        } else {
          // Fallback: usar paginación del cliente
          const startIndex = (page - 1) * PAGE_SIZE
          const endIndex = startIndex + PAGE_SIZE
          const paginatedSuppliers = suppliersData.slice(startIndex, endIndex)

          setSuppliers(paginatedSuppliers)
          setTotalItems(suppliersData.length)
          setCurrentPage(page)
          setTotalPages(Math.ceil(suppliersData.length / PAGE_SIZE))
        }
      }

    } catch (error) {
      toast.error("Error al cargar proveedores")
      setSuppliers([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleEditProvider = (provider: SupplierType) => {
    setSelectedSupplier(provider)
    setOpenEditProvider(true)
  }

  const handleDeleteSupplier = (supplier: SupplierType) => {
    setSelectedSupplier(supplier)
    setDeleteDialogOpen(true)
  }

  const handleOpenCurrentAccount = (supplier: SupplierType) => {
    if (!supplier.current_account?.id) {
      toast.error("Este proveedor no tiene una cuenta corriente activa.");
      return;
    }
    setSelectedSupplier(supplier)
    setCurrentAccountOpen(true)
  }

  const handleViewSupplier = async (supplier: SupplierType) => {
    try {
      setLoading(true)
      // Obtener los datos completos del proveedor incluyendo productos
      const fullSupplierData = await getSupplierById(supplier.id)
      setSelectedSupplier(fullSupplierData)
      setViewDialogOpen(true)
    } catch (error) {
      console.error('Error al obtener detalles del proveedor:', error)
      toast.error("Error al cargar los detalles del proveedor")
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSaved = async () => {
    setOpenNewProvider(false)
    setOpenEditProvider(false)
    setDeleteDialogOpen(false)
    setSelectedSupplier(null)
    await loadSuppliers(currentPage)
  }

  // Función de paginación para proveedores
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
      setCurrentPage(pageNumber);
      loadSuppliers(pageNumber);
    }
  };

  return (
    <BranchRequiredWrapper
      title="Selecciona una sucursal"
      description="Los proveedores necesitan una sucursal seleccionada para funcionar correctamente."
      requireSingleBranch={true}
    >
      {currentAccountOpen && selectedSupplier?.current_account?.id ? (
        <SupplierCurrentAccountDetails
          accountId={selectedSupplier.current_account.id}
          onBack={() => {
            setCurrentAccountOpen(false)
            setSelectedSupplier(null)
            loadSuppliers(currentPage)
          }}
        />
      ) : (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Directorio de Proveedores</h2>
            <div className="flex gap-2">
              {hasPermission('crear_proveedores') && (
                <Button onClick={() => setOpenNewProvider(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Proveedor
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
                  placeholder="Buscar proveedores..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            {suppliers.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-muted-foreground">
                {loading ? "Cargando proveedores..." : "No se encontraron proveedores."}
              </div>
            ) : (
              <Table ref={supplierTableRef}>
                <TableHeader>
                  <TableRow>
                    <ResizableTableHeader columnId="name" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps}>Empresa</ResizableTableHeader>
                    <ResizableTableHeader columnId="contact" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps} className="hidden md:table-cell">Contacto</ResizableTableHeader>
                    <ResizableTableHeader columnId="phone" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps} className="hidden md:table-cell">Teléfono</ResizableTableHeader>
                    <ResizableTableHeader columnId="balance" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps}>Saldo</ResizableTableHeader>
                    <ResizableTableHeader columnId="status" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps}>Estado</ResizableTableHeader>
                    <ResizableTableHeader columnId="actions" getResizeHandleProps={getSupplierResizeHandleProps} getColumnHeaderProps={getSupplierColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((provider) => (
                    <TableRow key={provider.id}>
                      <ResizableTableCell columnId="name" getColumnCellProps={getSupplierColumnCellProps}>
                        <span className="truncate" title={provider.name}>{provider.name}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="contact" getColumnCellProps={getSupplierColumnCellProps} className="hidden md:table-cell">
                        <span className="truncate" title={provider.contact_name || "-"}>{provider.contact_name || "-"}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="phone" getColumnCellProps={getSupplierColumnCellProps} className="hidden md:table-cell">
                        <span className="truncate" title={provider.phone || "-"}>{provider.phone || "-"}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="balance" getColumnCellProps={getSupplierColumnCellProps}>
                        <span className={`truncate font-medium ${(Number(provider.current_account?.current_balance || 0)) > 0 ? "text-red-600" : "text-green-600"}`}>
                          ${Number(provider.current_account?.current_balance || 0).toFixed(2)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="status" getColumnCellProps={getSupplierColumnCellProps}>
                        <Badge
                          variant="outline"
                          className={`${provider.status === 'active'
                            ? 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
                            : provider.status === 'pending'
                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
                              : 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
                            }`}
                        >
                          {provider.status === 'active' ? 'Activo' : provider.status === 'pending' ? 'En Revisión' : 'Inactivo'}
                        </Badge>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="actions" getColumnCellProps={getSupplierColumnCellProps} className="text-center">
                        <div className="flex gap-1 justify-end">
                          {hasPermission('ver_proveedores') && (
                            <Button variant="ghost" size="icon" onClick={() => handleViewSupplier(provider)} title="Ver" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('editar_proveedores') && (
                            <Button variant="ghost" size="icon" onClick={() => handleEditProvider(provider)} title="Editar" className="text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('eliminar_proveedores') && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(provider)} title="Eliminar" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenCurrentAccount(provider)} title="Cuenta Corriente" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                            <Wallet className="h-4 w-4" />
                          </Button>
                        </div>
                      </ResizableTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Paginación para proveedores */}
          <Pagination
            currentPage={currentPage}
            lastPage={totalPages}
            total={totalItems}
            itemName="proveedores"
            onPageChange={(page) => goToPage(page)}
            disabled={loading}
          />
        </div>
      )}

      <ProviderDialog open={openNewProvider} onOpenChange={setOpenNewProvider} onSaved={handleProviderSaved} />
      <ProviderDialog open={openEditProvider} onOpenChange={setOpenEditProvider} supplier={selectedSupplier} onSaved={handleProviderSaved} />
      <DeleteSupplierDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} supplier={selectedSupplier} onDelete={handleProviderSaved} />
      <ViewSupplierDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} supplier={selectedSupplier} />
    </BranchRequiredWrapper>
  )
}
