import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Plus, Search, ShoppingBag, Trash2, Pencil, Eye, CheckCircle, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProviderDialog from "@/components/provider-dialog"
import { DeleteSupplierDialog } from "@/components/delete-supplier-dialog"
import { ViewSupplierDialog } from "@/components/view-supplier-dialog";
import { NewPurchaseOrderDialog } from "@/components/new-purchase-order-dialog"
import { ViewPurchaseOrderDialog } from "@/components/view-purchase-order-dialog"
import EditPurchaseOrderDialog from "@/components/edit-purchase-order-dialog"
import { getSupplierById } from "@/lib/api/supplierService"
import { getPurchaseOrders, finalizePurchaseOrder, cancelPurchaseOrder, getPurchaseSummaryByCurrency } from "@/lib/api/purchaseOrderService"
import type { Supplier as SupplierType } from "@/types"
import type { PurchaseOrder as APIPurchaseOrder } from "@/lib/api/purchaseOrderService"
import { toast } from "sonner"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "@/components/ui/date-range-picker"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus"
import { useAuth } from "@/hooks/useAuth"
import useApi from "@/hooks/useApi"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import Pagination from "@/components/ui/pagination"

// Remove previously declared local interfaces for Supplier and PurchaseOrder
// They conflicted with shared types. Using SupplierType and APIPurchaseOrder instead.

export default function ProveedoresPage() {
  const { hasPermission } = useAuth();
  const { request } = useApi();
  const [searchTerm, setSearchTerm] = useState("")

  // Configuración de columnas redimensionables para proveedores
  const supplierColumnConfig = [
    { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'contact', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
    { id: 'phone', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
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

  // Configuración de columnas redimensionables para órdenes de compra
  const orderColumnConfig = [
    { id: 'number', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'supplier', minWidth: 200, maxWidth: 350, defaultWidth: 250 },
    { id: 'date', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'total', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
  ];

  const {
    getResizeHandleProps: getOrderResizeHandleProps,
    getColumnHeaderProps: getOrderColumnHeaderProps,
    getColumnCellProps: getOrderColumnCellProps,
    tableRef: orderTableRef
  } = useResizableColumns({
    columns: orderColumnConfig,
    storageKey: 'ordenes-compra-column-widths',
    defaultWidth: 150
  });
  const [openNewProvider, setOpenNewProvider] = useState(false)
  const [openEditProvider, setOpenEditProvider] = useState(false)
  const [openNewPurchaseOrder, setOpenNewPurchaseOrder] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewPurchaseOrderDialogOpen, setViewPurchaseOrderDialogOpen] = useState(false)
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<number | null>(null)
  const [editPurchaseOrderDialogOpen, setEditPurchaseOrderDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierType[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<APIPurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  // Estados de paginación para proveedores
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 8
  
  // Estados de paginación para órdenes de compra
  const [currentPOPage, setCurrentPOPage] = useState(1)
  const [totalPOItems, setTotalPOItems] = useState(0)
  const [totalPOPages, setTotalPOPages] = useState(1)
  const PO_PAGE_SIZE = 5

  // Nuevos estados para el resumen
  const [summary, setSummary] = useState<{ ARS?: number; USD?: number }>({})
  const [summaryPeriod, setSummaryPeriod] = useState<{ from: string; to: string } | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(2025, 8, 1),
    to: new Date(2025, 8, 30),
  })

  // Obtener el estado de la caja abierta para la sucursal seleccionada
  const { currentBranch } = useAuth();
  const branchId = currentBranch?.id ? Number(currentBranch.id) : 1;
  const { status: cashRegisterStatus, isOpen: isCashRegisterOpen } = useCashRegisterStatus(branchId);

  // Fetch suppliers from backend
  useEffect(() => {
    loadSuppliers(1)
    loadPurchaseOrders(1)
  }, [])

  useEffect(() => {
    const fetchSummary = async () => {
      if (dateRange?.from && dateRange.to) {
        try {
          const fromDate = format(dateRange.from, "yyyy-MM-dd")
          const toDate = format(dateRange.to, "yyyy-MM-dd")
          const summaryData = await getPurchaseSummaryByCurrency(fromDate, toDate)
          setSummary(summaryData.totals)
          setSummaryPeriod({ from: summaryData.from, to: summaryData.to })
        } catch (error) {
          toast.error("Error al cargar el resumen de compras por moneda.")
          setSummary({})
          setSummaryPeriod(null)
        }
      }
    }
    fetchSummary()
  }, [dateRange])

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

  // Modificar loadPurchaseOrders para aceptar fechas
  const loadPurchaseOrders = async (page = 1, from?: string, to?: string) => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const orders = await getPurchaseOrders(params);
      const startIndex = (page - 1) * PO_PAGE_SIZE;
      const endIndex = startIndex + PO_PAGE_SIZE;
      const paginatedOrders = orders.slice(startIndex, endIndex);
      setPurchaseOrders(paginatedOrders);
      setTotalPOItems(orders.length);
      setCurrentPOPage(page);
      setTotalPOPages(Math.ceil(orders.length / PO_PAGE_SIZE));
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error("Error al cargar órdenes de compra");
      setPurchaseOrders([]);
      setTotalPOItems(0);
      setTotalPOPages(1);
    }
  }

  // Actualizar useEffect para cargar órdenes de compra al cambiar el periodo
  useEffect(() => {
    if (dateRange?.from && dateRange.to) {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      loadPurchaseOrders(1, fromDate, toDate);
    }
  }, [dateRange])

  const handleEditProvider = (provider: SupplierType) => {
    setSelectedSupplier(provider)
    setOpenEditProvider(true)
  }

  const handleDeleteSupplier = (supplier: SupplierType) => {
    setSelectedSupplier(supplier)
    setDeleteDialogOpen(true)
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

  // Funciones de paginación para órdenes de compra
  const goToPOPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPOPages && pageNumber !== currentPOPage && !loading) {
      setCurrentPOPage(pageNumber);
      loadPurchaseOrders(pageNumber);
    }
  };


    const handlePurchaseOrderSaved = async () => {
    setOpenNewPurchaseOrder(false)
    setEditPurchaseOrderDialogOpen(false)
    await loadPurchaseOrders(currentPOPage)
  }

  const refreshCards = async () => {
    setLoading(true);
    await loadPurchaseOrders();
    // Refresca el resumen de compras
    if (dateRange?.from && dateRange.to) {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      try {
        const summaryData = await getPurchaseSummaryByCurrency(fromDate, toDate);
        setSummary(summaryData.totals);
        setSummaryPeriod({ from: summaryData.from, to: summaryData.to });
      } catch {
        setSummary({});
        setSummaryPeriod(null);
      }
    }
    setLoading(false);
  };

  const handleCompletePurchaseOrder = async (orderId: number) => {
    if (!isCashRegisterOpen || !cashRegisterStatus?.cash_register?.id) {
      toast.error("No hay caja abierta en la sucursal seleccionada. Debe abrir la caja antes de finalizar la orden.");
      return;
    }
    try {
      const cashRegisterId = cashRegisterStatus.cash_register.id;
      await finalizePurchaseOrder(orderId, cashRegisterId);
      toast.success("Orden de compra finalizada exitosamente");
      await refreshCards();
    } catch (error) {
      toast.error("Error al finalizar la orden de compra");
    }
  }

  const handleCancelPurchaseOrder = async (orderId: number) => {
    try {
      await cancelPurchaseOrder(orderId)
      toast.success("Orden de compra cancelada")
      await refreshCards()
    } catch (error) {
      toast.error("Error al cancelar la orden de compra")
    }
  }

  const handleViewPurchaseOrder = (order: APIPurchaseOrder) => {
    setSelectedPurchaseOrderId(order.id ?? null)
    setViewPurchaseOrderDialogOpen(true)
  }

  const handleEditPurchaseOrder = (order: APIPurchaseOrder) => {
    setSelectedPurchaseOrderId(order.id ?? null)
    setEditPurchaseOrderDialogOpen(true)
  }

  const isPending = (status?: string) => (status ?? '').toLowerCase() === 'pending' || (status ?? '') === ''

  const getStatusBadgeColor = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    switch (s) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
      case 'completed':
        return 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700'
    }
  }

  const getStatusLabel = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    switch (s) {
      case 'pending':
        return 'Pendiente'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status || 'Pendiente'
    }
  }

  const getOrderTotalNumber = (order: APIPurchaseOrder): number => {
    if (order.total_amount) {
      return typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount
    }
    if (typeof order.total === 'string') return parseFloat(order.total)
    return 0
  }

  const filteredPurchaseOrders = purchaseOrders.filter(order => {
    const matchesSearch = (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.id?.toString() || '').includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || (order.status || '').toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingOrders = purchaseOrders.filter(order => isPending(order.status)).length
  const activeSuppliers = suppliers.filter(supplier => supplier.status === 'active').length

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

  return (
    <BranchRequiredWrapper 
      title="Selecciona una sucursal" 
      description="Los proveedores y órdenes de compra necesitan una sucursal seleccionada para funcionar correctamente."
      requireSingleBranch={true}
    >
      <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Proveedores</h2>
        <div className="flex gap-2">
          <Button onClick={() => setOpenNewPurchaseOrder(true)} variant="outline">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Nueva Orden de Compra
          </Button>
          {hasPermission('crear_proveedores') && (
            <Button onClick={() => setOpenNewProvider(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="compras" className="flex flex-1 flex-col space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="compras">Compras a Proveedores</TabsTrigger>
          <TabsTrigger value="directorio">Directorio de Proveedores</TabsTrigger>
        </TabsList>
        <TabsContent value="compras" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Card: Total de Compras con ARS y USD */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Compras</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ARS: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(summary.ARS || 0)}
                </div>
                <div className="text-2xl font-bold">
                  USD: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.USD || 0)}
                </div>
                {summaryPeriod && (
                  <p className="text-xs text-muted-foreground">
                    Período: {new Date(summaryPeriod.from + 'T00:00:00').toLocaleDateString('es-ES')} al {new Date(summaryPeriod.to + 'T00:00:00').toLocaleDateString('es-ES')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Total de {purchaseOrders.length} órdenes</p>
              </CardContent>
            </Card>
            {/* Card: Compras Pendientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras Pendientes</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders}</div>
                <p className="text-xs text-muted-foreground">Órdenes pendientes de recepción</p>
              </CardContent>
            </Card>
            {/* Card: Proveedores Activos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSuppliers}</div>
                <p className="text-xs text-muted-foreground">de {suppliers.length} proveedores registrados</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center space-x-2">
            <Label>Período</Label>
            <DatePickerWithRange
              selected={dateRange}
              onSelect={(range) => {
                if (range && range.from) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
          </div>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar compras..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            {filteredPurchaseOrders.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-muted-foreground">
                {loading ? "Cargando órdenes de compra..." : "No hay órdenes de compra que coincidan con los filtros."}
              </div>
            ) : (
              <Table ref={orderTableRef}>
                <TableHeader>
                  <TableRow>
                    <ResizableTableHeader columnId="number" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>ID Orden</ResizableTableHeader>
                    <ResizableTableHeader columnId="supplier" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Proveedor</ResizableTableHeader>
                    <ResizableTableHeader columnId="date" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps} className="hidden md:table-cell">Fecha</ResizableTableHeader>
                    <ResizableTableHeader columnId="total" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps} className="hidden md:table-cell">Total</ResizableTableHeader>
                    <ResizableTableHeader columnId="status" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Estado</ResizableTableHeader>
                    <ResizableTableHeader columnId="actions" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((order, index) => (
                    <TableRow key={order.id ?? index}>
                      <ResizableTableCell columnId="number" getColumnCellProps={getOrderColumnCellProps} className="font-medium">
                        <span className="truncate" title={`#${order.id ?? '-'}`}>#{order.id ?? '-'}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="supplier" getColumnCellProps={getOrderColumnCellProps}>
                        <span className="truncate" title={order.supplier?.name || 'N/A'}>{order.supplier?.name || 'N/A'}</span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="date" getColumnCellProps={getOrderColumnCellProps} className="hidden md:table-cell">
                        <span className="truncate" title={order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : 'N/A'}>
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : 'N/A'}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="total" getColumnCellProps={getOrderColumnCellProps} className="hidden md:table-cell">
                        <span className="truncate" title={`${formatCurrency(getOrderTotalNumber(order))}${order.currency ? ` (${order.currency})` : ''}`}>
                          {formatCurrency(getOrderTotalNumber(order))}
                          {order.currency ? ` (${order.currency})` : ''}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="status" getColumnCellProps={getOrderColumnCellProps}>
                        <Badge variant="outline" className={getStatusBadgeColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </ResizableTableCell>
                      <ResizableTableCell columnId="actions" getColumnCellProps={getOrderColumnCellProps} className="text-center">
                        <div className="flex gap-1 justify-center">
                            {/* Solo mostrar 'Ver orden de compra' si la orden es de mercadería */}
                            {hasPermission('ver_compras') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewPurchaseOrder(order)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          {isPending(order.status) && order.id && (
                            <>
                              {hasPermission('editar_compras') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPurchaseOrder(order)}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                              )}
                              {hasPermission('aprobar_compras') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCompletePurchaseOrder(order.id!)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Completar
                                </Button>
                              )}
                              {hasPermission('eliminar_compras') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelPurchaseOrder(order.id!)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </ResizableTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Paginación para órdenes de compra */}
          <Pagination
            currentPage={currentPOPage}
            lastPage={totalPOPages}
            total={totalPOItems}
            itemName="órdenes de compra"
            onPageChange={(page) => goToPOPage(page)}
            disabled={loading}
          />
        </TabsContent>

        <TabsContent value="directorio" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar proveedores..." className="w-full pl-8" />
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
                      <ResizableTableCell columnId="status" getColumnCellProps={getSupplierColumnCellProps}>
                        <Badge
                          variant="outline"
                          className={`bg-${provider.status === 'active' ? 'green' : provider.status === 'pending' ? 'yellow' : 'red'}-50 text-${provider.status === 'active' ? 'green' : provider.status === 'pending' ? 'yellow' : 'red'}-700 hover:bg-${provider.status === 'active' ? 'green' : provider.status === 'pending' ? 'yellow' : 'red'}-50 hover:text-${provider.status === 'active' ? 'green' : provider.status === 'pending' ? 'yellow' : 'red'}-700`}
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
        </TabsContent>
      </Tabs>
      <ProviderDialog open={openNewProvider} onOpenChange={setOpenNewProvider} onSaved={handleProviderSaved} />
      <NewPurchaseOrderDialog open={openNewPurchaseOrder} onOpenChange={setOpenNewPurchaseOrder} onSaved={handlePurchaseOrderSaved} />
      <ProviderDialog open={openEditProvider} onOpenChange={setOpenEditProvider} supplier={selectedSupplier} onSaved={handleProviderSaved} />
      <DeleteSupplierDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} supplier={selectedSupplier} onDelete={handleProviderSaved} />
      <ViewSupplierDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} supplier={selectedSupplier} />
      <ViewPurchaseOrderDialog 
        open={viewPurchaseOrderDialogOpen} 
        onOpenChange={setViewPurchaseOrderDialogOpen} 
        purchaseOrderId={selectedPurchaseOrderId} 
      />
      {selectedPurchaseOrderId && (
        <EditPurchaseOrderDialog
          open={editPurchaseOrderDialogOpen}
          onOpenChange={setEditPurchaseOrderDialogOpen}
          purchaseOrderId={selectedPurchaseOrderId}
          onSaved={loadPurchaseOrders}
        />
      )}
      </div>
    </BranchRequiredWrapper>
  )
}
