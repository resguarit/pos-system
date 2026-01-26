/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Plus, Search, ShoppingBag, CheckCircle, XCircle, Eye, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NewPurchaseOrderDialog } from "@/components/new-purchase-order-dialog"
import { ViewPurchaseOrderDialog } from "@/components/view-purchase-order-dialog"
import EditPurchaseOrderDialog from "@/components/edit-purchase-order-dialog"
import { CancelPurchaseOrderDialog } from "@/components/cancel-purchase-order-dialog"
import { getPurchaseOrders, finalizePurchaseOrder, getPurchaseSummaryByCurrency } from "@/lib/api/purchaseOrderService"
import type { PurchaseOrder as APIPurchaseOrder } from "@/lib/api/purchaseOrderService"
import { toast } from "sonner"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "@/components/ui/date-range-picker"
import { format, startOfMonth } from "date-fns"
import { Label } from "@/components/ui/label"
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus"
import { useAuth } from "@/hooks/useAuth"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import Pagination from "@/components/ui/pagination"
import { useBranch } from "@/context/BranchContext"

export default function PurchaseOrderPage() {
  const { hasPermission, currentBranch } = useAuth();
  const { selectedBranchIds, branches } = useBranch();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("")

  // Estados para filtros de sucursales desde Caja
  const [filteredBranchIds, setFilteredBranchIds] = useState<number[]>([])
  const [preselectedBranchId, setPreselectedBranchId] = useState<number | undefined>(undefined)
  const [disableBranchSelection, setDisableBranchSelection] = useState(false)
  const [branchFilter, setBranchFilter] = useState<string>('all')

  // Configuración de columnas redimensionables para órdenes de compra
  const orderColumnConfig = [
    { id: 'number', minWidth: 60, maxWidth: 180, defaultWidth: 140 },
    { id: 'supplier', minWidth: 120, maxWidth: 350, defaultWidth: 200 },
    { id: 'branch', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'date', minWidth: 100, maxWidth: 180, defaultWidth: 140 },
    { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'total', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'actions', minWidth: 280, maxWidth: 400, defaultWidth: 320 }
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

  const [openNewPurchaseOrder, setOpenNewPurchaseOrder] = useState(false)
  const [viewPurchaseOrderDialogOpen, setViewPurchaseOrderDialogOpen] = useState(false)
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<number | null>(null)
  const [editPurchaseOrderDialogOpen, setEditPurchaseOrderDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null)
  const [cancelOrderStatus, setCancelOrderStatus] = useState<string>('')
  const [purchaseOrders, setPurchaseOrders] = useState<APIPurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  // Estados de paginación para órdenes de compra
  const [currentPOPage, setCurrentPOPage] = useState(1)
  const [totalPOItems, setTotalPOItems] = useState(0)
  const [totalPOPages, setTotalPOPages] = useState(1)
  const PO_PAGE_SIZE = 10

  // Nuevos estados para el resumen
  const [summary, setSummary] = useState<{ ARS?: number; USD?: number }>({})
  const [summaryPeriod, setSummaryPeriod] = useState<{ from: string; to: string } | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })

  // Obtener el estado de la caja abierta para la sucursal seleccionada
  const branchId = currentBranch?.id ? Number(currentBranch.id) : 1;
  const { status: cashRegisterStatus, isOpen: isCashRegisterOpen } = useCashRegisterStatus(branchId);

  // Leer parámetros de URL para filtros de sucursales
  useEffect(() => {
    const branchIds = searchParams.get('branch_ids')
    const preselectedBranch = searchParams.get('preselected_branch_id')
    const disableSelection = searchParams.get('disable_branch_selection')

    if (branchIds) {
      const ids = branchIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      setFilteredBranchIds(ids)
    }

    if (preselectedBranch) {
      const branchId = parseInt(preselectedBranch)
      if (!isNaN(branchId)) {
        setPreselectedBranchId(branchId)
      }
    }

    if (disableSelection === 'true') {
      setDisableBranchSelection(true)
    }
  }, [searchParams])

  // Fetch purchase orders from backend - Logic moved to the dependency-based effect below
  // useEffect(() => { ... }, []) removed to avoid double fetch

  // Recargar órdenes cuando cambien los filtros de sucursales
  useEffect(() => {
    if (filteredBranchIds.length > 0) {
      loadPurchaseOrders(1)
    }
  }, [filteredBranchIds, loadPurchaseOrders])

  useEffect(() => {
    const fetchSummary = async () => {
      if (dateRange?.from && dateRange?.to) {
        try {
          const fromDate = format(dateRange?.from, "yyyy-MM-dd")
          const toDate = format(dateRange?.to, "yyyy-MM-dd")
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

  // Modificar loadPurchaseOrders para aceptar fechas y filtros de sucursales
  const loadPurchaseOrders = useCallback(async (page = 1, from?: string, to?: string) => {
    try {
      setLoading(true)
      const params: any = {
        page: page,
        per_page: PO_PAGE_SIZE
      };
      if (from) params.from = from;
      if (to) params.to = to;

      // Si hay sucursales filtradas, aplicar el filtro
      if (filteredBranchIds.length > 0) {
        // Si solo hay una sucursal, filtrar por esa específica
        if (filteredBranchIds.length === 1) {
          params.branch_id = filteredBranchIds[0];
        }
        // Si hay múltiples sucursales, el backend debería manejar esto
        // Por ahora, usamos la primera sucursal como fallback
        else {
          params.branch_id = filteredBranchIds[0];
        }
      }

      const response = await getPurchaseOrders(params);

      // Si hay múltiples sucursales filtradas, filtrar en el frontend (Backend pagination might make this tricky if not supported on backend)
      // Assuming backend returns paginated results filtered by single branch_id if sent.
      // If we need multi-branch support in backend, that's a separate task, but logic here assumes response is PaginatedResponse.

      const orders = response.data;

      // Client side filtering for multi-branch if backend doesn't support array (it supports single branch_id)
      let filteredOrders = orders;
      if (filteredBranchIds.length > 1) {
        // Note: This logic is flawed with server-side pagination if backend doesn't filter.
        // But preserving existing behavior for now within pagination limits.
        filteredOrders = orders.filter(order =>
          order.branch_id && filteredBranchIds.includes(order.branch_id)
        );
      } else {
        filteredOrders = orders;
      }

      // No client-side slicing needed
      setPurchaseOrders(filteredOrders);
      setTotalPOItems(response.total);
      setCurrentPOPage(response.current_page);
      setTotalPOPages(response.last_page);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error("Error al cargar órdenes de compra");
      setPurchaseOrders([]);
      setTotalPOItems(0);
      setTotalPOPages(1);
    } finally {
      setLoading(false)
    }
  }, [filteredBranchIds, PO_PAGE_SIZE])

  // Actualizar useEffect para cargar órdenes de compra al cambiar el periodo
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const fromDate = format(dateRange?.from, "yyyy-MM-dd");
      const toDate = format(dateRange?.to, "yyyy-MM-dd");
      loadPurchaseOrders(currentPOPage, fromDate, toDate);
    } else {
      // If dates are cleared, load all orders (or default logic)
      loadPurchaseOrders(currentPOPage);
    }
  }, [dateRange, currentPOPage, loadPurchaseOrders])

  // Funciones de paginación para órdenes de compra
  const goToPOPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPOPages && pageNumber !== currentPOPage && !loading) {
      setCurrentPOPage(pageNumber);
      // loadPurchaseOrders(pageNumber); // Removed to avoid race condition/double fetch, explicit useEffect handles it
    }
  };

  const handlePurchaseOrderSaved = async () => {
    setOpenNewPurchaseOrder(false)
    setEditPurchaseOrderDialogOpen(false)
    // Mantener el filtro de fechas al recargar
    if (dateRange?.from && dateRange?.to) {
      const fromDate = format(dateRange?.from, "yyyy-MM-dd");
      const toDate = format(dateRange?.to, "yyyy-MM-dd");
      await loadPurchaseOrders(currentPOPage, fromDate, toDate);
    } else {
      await loadPurchaseOrders(currentPOPage);
    }
  }

  const refreshCards = async () => {
    setLoading(true);
    await loadPurchaseOrders(currentPOPage);
    // Refresca el resumen de compras
    if (dateRange?.from && dateRange?.to) {
      const fromDate = format(dateRange?.from, "yyyy-MM-dd");
      const toDate = format(dateRange?.to, "yyyy-MM-dd");
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

  const handleCancelPurchaseOrder = (order: APIPurchaseOrder) => {
    if (!order.id) return
    setCancelOrderId(order.id)
    setCancelOrderStatus(order.status || 'pending')
    setCancelDialogOpen(true)
  }

  const handleCancelDialogComplete = async () => {
    const wasCompleted = cancelOrderStatus === 'completed'
    if (wasCompleted) {
      toast.success("Orden de compra cancelada y revertida exitosamente")
    } else {
      toast.success("Orden de compra cancelada")
    }
    await refreshCards()
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
    const matchesBranch = branchFilter === 'all' ? true :
      (order.branch_id ? order.branch_id.toString() === branchFilter : false)
    return matchesSearch && matchesStatus && matchesBranch
  })

  const pendingOrders = purchaseOrders.filter(order => isPending(order.status)).length

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

  const getBranchColor = (order: APIPurchaseOrder) => {
    if (order.branch_id) {
      const branch = branches.find(b => Number(b.id) === order.branch_id);
      return branch?.color || '#6b7280';
    }
    return '#6b7280'; // Color por defecto
  };

  const getBranchName = (order: APIPurchaseOrder) => {
    if (order.branch_id) {
      const branch = branches.find(b => Number(b.id) === order.branch_id);
      return branch?.description || 'N/A';
    }
    return 'N/A';
  };

  return (
    <BranchRequiredWrapper
      title="Selecciona una sucursal"
      description="Las órdenes de compra necesitan una sucursal seleccionada para funcionar correctamente."
      requireSingleBranch={true}
    >
      <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h2>
          <div className="flex gap-2">
            {hasPermission('crear_ordenes_compra') && (
              <Button onClick={() => setOpenNewPurchaseOrder(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Orden de Compra
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card: Total de Compras con ARS y USD */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Compras</CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
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
                className="h-4 w-4 text-amber-600"
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

          {/* Card: Total de Órdenes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Órdenes</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-emerald-600"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPOItems}</div>
              <p className="text-xs text-muted-foreground">En el período seleccionado</p>
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
            showClearButton={true}
            onClear={() => setDateRange(undefined)}
          />
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar órdenes..."
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
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch Filter - Only show when multiple branches are selected */}
            {selectedBranchIds.length > 1 && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches?.filter(branch => selectedBranchIds.includes(branch.id.toString())).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      <div className="flex items-center gap-2">
                        {branch.color && (
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: branch.color }}
                          />
                        )}
                        <span>{branch.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          {filteredPurchaseOrders.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-muted-foreground">
              {loading ? "Cargando órdenes de compra..." : "No se encontraron órdenes de compra."}
            </div>
          ) : (
            <Table ref={orderTableRef}>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader columnId="number" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>N° Orden</ResizableTableHeader>
                  <ResizableTableHeader columnId="supplier" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Proveedor</ResizableTableHeader>
                  <ResizableTableHeader columnId="branch" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps} className={selectedBranchIds.length > 1 ? "" : "hidden"}>Sucursal</ResizableTableHeader>
                  <ResizableTableHeader columnId="date" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Fecha</ResizableTableHeader>
                  <ResizableTableHeader columnId="status" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Estado</ResizableTableHeader>
                  <ResizableTableHeader columnId="total" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps}>Total</ResizableTableHeader>
                  <ResizableTableHeader columnId="actions" getResizeHandleProps={getOrderResizeHandleProps} getColumnHeaderProps={getOrderColumnHeaderProps} className="text-center min-w-[280px]">Acciones</ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchaseOrders.map((order) => (
                  <TableRow key={order.id}>
                    <ResizableTableCell columnId="number" getColumnCellProps={getOrderColumnCellProps}>
                      <span className="truncate" title={`#${order.id}`}>#{order.id}</span>
                    </ResizableTableCell>
                    <ResizableTableCell columnId="supplier" getColumnCellProps={getOrderColumnCellProps}>
                      <span className="truncate" title={order.supplier?.name || "-"}>{order.supplier?.name || "-"}</span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="branch"
                      getColumnCellProps={getOrderColumnCellProps}
                      className={selectedBranchIds.length > 1 ? "" : "hidden"}
                    >
                      {(() => {
                        const branchColor = getBranchColor(order);
                        const branchName = getBranchName(order);

                        return (
                          <Badge
                            variant="outline"
                            className="text-xs border-2 font-medium"
                            style={{
                              borderColor: branchColor,
                              color: branchColor,
                              backgroundColor: `${branchColor}10`
                            }}
                          >
                            {branchName}
                          </Badge>
                        );
                      })()}
                    </ResizableTableCell>
                    <ResizableTableCell columnId="date" getColumnCellProps={getOrderColumnCellProps}>
                      {new Date(order.order_date).toLocaleDateString('es-ES')}
                    </ResizableTableCell>
                    <ResizableTableCell columnId="status" getColumnCellProps={getOrderColumnCellProps}>
                      <Badge variant="outline" className={getStatusBadgeColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell columnId="total" getColumnCellProps={getOrderColumnCellProps}>
                      {formatCurrency(getOrderTotalNumber(order))}
                    </ResizableTableCell>
                    <ResizableTableCell columnId="actions" getColumnCellProps={getOrderColumnCellProps} className="text-center">
                      <div className="flex gap-1 justify-center">
                        {hasPermission('ver_ordenes_compra') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPurchaseOrder(order)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {isPending(order.status) && order.id && (
                          <>
                            {hasPermission('editar_ordenes_compra') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPurchaseOrder(order)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('completar_ordenes_compra') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCompletePurchaseOrder(order.id!)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Completar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('cancelar_ordenes_compra') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelPurchaseOrder(order)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Cancelar"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        {/* Cancel button for completed orders */}
                        {order.status === 'completed' && hasPermission('cancelar_ordenes_compra') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelPurchaseOrder(order)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Cancelar y Revertir"
                          >
                            <XCircle className="h-4 w-4" />
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

        {/* Paginación para órdenes de compra */}
        <Pagination
          currentPage={currentPOPage}
          lastPage={totalPOPages}
          total={totalPOItems}
          itemName="órdenes"
          onPageChange={(page) => goToPOPage(page)}
          disabled={loading}
        />
      </div>

      <NewPurchaseOrderDialog
        open={openNewPurchaseOrder}
        onOpenChange={setOpenNewPurchaseOrder}
        onSaved={handlePurchaseOrderSaved}
        preselectedBranchId={preselectedBranchId}
        disableBranchSelection={disableBranchSelection}
      />
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
          onSaved={handlePurchaseOrderSaved}
        />
      )}
      <CancelPurchaseOrderDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        orderId={cancelOrderId}
        orderStatus={cancelOrderStatus}
        onCancelled={handleCancelDialogComplete}
      />
    </BranchRequiredWrapper>
  )
}
