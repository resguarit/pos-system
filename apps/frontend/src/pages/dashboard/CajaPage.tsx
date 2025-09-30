import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
  FileText,
  type LucideIcon,
  PlusCircle,
  Search,
  Wallet,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCcw,
  Eye,
  Coins,
  BarChart3,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import useCashRegister from "@/hooks/useCashRegister"
import useCashRegisterOptimized from "@/hooks/useCashRegisterOptimized"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import ViewSaleDialog from "@/components/view-sale-dialog"
import { ViewPurchaseOrderDialog } from "@/components/view-purchase-order-dialog"
import useApi from "@/hooks/useApi"
import { useSearchParams } from "react-router-dom"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/context/AuthContext"
import CashRegisterStatusBadge from "@/components/cash-register-status-badge"
import Pagination from "@/components/ui/pagination"
import SelectBranchPlaceholder from "@/components/ui/select-branch-placeholder"

// Componente de tarjeta con icono
interface StatCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  colorClass?: string
}

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  colorClass = "bg-primary/10 text-primary",
}: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={`rounded-full p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="card-value">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
)


export default function CajaPage() {
  // Hook personalizado para manejar la caja
  const {
    currentRegister,
    movements,
    movementTypes,
    paymentMethods,
    registerHistory,
    isLoading: hookLoading,
    loadCurrentCashRegister,
    openCashRegister,
    closeCashRegister,
    addMovement,
    deleteMovement,
    loadMovementTypes,
    loadPaymentMethods,
    loadRegisterHistory,
    calculateTodayIncome,
    calculateTodayExpenses,
    // nuevo: paginado de movimientos
    loadMovements,
    loadAllMovements,
    movementsMeta,
    // agregado: saldo desde apertura
    calculateBalanceSinceOpening,
  } = useCashRegister()
  
  const { request } = useApi()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedBranchIds, selectionChangeToken } = useBranch()
  const { user } = useAuth()
  
  // Derivar branch actual desde el contexto
  const currentBranchId = selectedBranchIds?.[0]
    ? parseInt(String(selectedBranchIds[0]), 10)
    : undefined

  // Hook optimizado con datos pre-calculados del backend
  const {
    currentCashRegister: optimizedCashRegister,
    loading: optimizedLoading,
    refetch: refetchOptimized,
    isCashPaymentMethod
  } = useCashRegisterOptimized(currentBranchId || null)

  // Estados de UI
  const [openNewMovementDialog, setOpenNewMovementDialog] = useState(false)
  const [openCashRegisterDialog, setOpenCashRegisterDialog] = useState(false)
  const [openCloseCashDialog, setOpenCloseCashDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("history") // Cambiar tab por defecto
  const [movementTypeFilter, setMovementTypeFilter] = useState("all") // Filtro por tipo
  const [movementsPage, setMovementsPage] = useState(1) // Estado para la página de movimientos
  const movementsPerPage = 10 // Constante para movimientos por página

  // Configuración de columnas redimensionables para tabla de movimientos
  const movementsColumnConfig = [
    { id: 'type', minWidth: 80, maxWidth: 150, defaultWidth: 100 },
    { id: 'description', minWidth: 150, maxWidth: 400, defaultWidth: 250 },
    { id: 'method', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'date', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'amount', minWidth: 100, maxWidth: 180, defaultWidth: 130 },
    { id: 'user', minWidth: 100, maxWidth: 200, defaultWidth: 150 },
    { id: 'actions', minWidth: 80, maxWidth: 120, defaultWidth: 100 }
  ];

  // Configuración de columnas redimensionables para historial de cajas
  const historyColumnConfig = [
    { id: 'status', minWidth: 80, maxWidth: 140, defaultWidth: 100 },
    { id: 'opening', minWidth: 140, maxWidth: 200, defaultWidth: 170 },
    { id: 'closing', minWidth: 140, maxWidth: 200, defaultWidth: 170 },
    { id: 'initial_amount', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'system_amount', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'counted_cash', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'difference', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'user', minWidth: 100, maxWidth: 180, defaultWidth: 130 },
    { id: 'observations', minWidth: 150, maxWidth: 300, defaultWidth: 200 }
  ];

  const {
    getResizeHandleProps: getMovementsResizeHandleProps,
    getColumnHeaderProps: getMovementsColumnHeaderProps,
    tableRef: movementsTableRef
  } = useResizableColumns({
    columns: movementsColumnConfig,
    storageKey: 'caja-movimientos-column-widths',
    defaultWidth: 150
  });

  const {
    getResizeHandleProps: getHistoryResizeHandleProps,
    getColumnHeaderProps: getHistoryColumnHeaderProps,
    getColumnCellProps: getHistoryColumnCellProps,
    tableRef: historyTableRef
  } = useResizableColumns({
    columns: historyColumnConfig,
    storageKey: 'caja-historial-column-widths',
    defaultWidth: 150
  });

  // Modal de detalle de venta
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  
  // Estados del formulario de movimiento
  const [movementForm, setMovementForm] = useState({
    movement_type_id: '',
    payment_method_id: '',
    amount: '',
    description: '',
  })
  
  // Estados del formulario de apertura de caja
  const [openingForm, setOpeningForm] = useState({
    opening_balance: '',
    notes: '',
  })
  
  // Estados del formulario de cierre de caja
  const [closingForm, setClosingForm] = useState({
    closing_balance: '',
    notes: '',
  })

  // Estado para forzar re-render del status badge cuando se cierre la caja
  const [statusRefreshKey, setStatusRefreshKey] = useState(0)

  // Paginación para el historial de cajas
  const [registerHistoryPage, setRegisterHistoryPage] = useState(1)
  const registerHistoryPerPage = 5
  const registerHistoryTotalPages = Math.max(1, Math.ceil(registerHistory.length / registerHistoryPerPage))
  const pagedRegisterHistory = registerHistory.slice(
    (registerHistoryPage - 1) * registerHistoryPerPage,
    registerHistoryPage * registerHistoryPerPage
  )

  // Estado para el diálogo de orden de compra
  const [openPurchaseOrderDialog, setOpenPurchaseOrderDialog] = useState(false)
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<number | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    // Inicializar paginación desde URL
    // Ya no cargamos datos aquí; esperamos a tener currentBranchId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar datos cuando haya una sucursal seleccionada o cambie la selección
  useEffect(() => {
    const load = async () => {
      if (!currentBranchId || !Number.isFinite(currentBranchId)) return
      const bid = Number(currentBranchId)
      setIsPageLoading(true)
      try {
        await Promise.all([
          loadCurrentCashRegister(bid),
          loadMovementTypes(),
          loadPaymentMethods(),
          loadRegisterHistory(bid),
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Error al cargar los datos de caja')
      } finally {
        setIsPageLoading(false)
      }
    }
    load()
    // Escucha del token para garantizar refetch cuando cambie selección
  }, [currentBranchId, selectionChangeToken])

  // Cuando cambia la página de movimientos, perPage o filtros, recargar
  useEffect(() => {
    if (currentRegister?.id) {
      loadMovements(currentRegister.id, movementsPage, movementsPerPage, searchTerm, false)
      
      // También cargar TODOS los movimientos para las estadísticas (solo en la primera página)
      if (movementsPage === 1) {
        loadAllMovements(currentRegister.id)
      }
      
      const sp = new URLSearchParams(searchParams)
      sp.set('page', String(movementsPage))
      sp.set('per_page', String(movementsPerPage))
      if (movementTypeFilter !== "all") {
        sp.set('type', movementTypeFilter)
      } else {
        sp.delete('type')
      }
      setSearchParams(sp, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRegister?.id, movementsPage, movementsPerPage, searchTerm, movementTypeFilter])

  const handleOpenCashRegister = async () => {
    if (!currentBranchId || !Number.isFinite(currentBranchId)) {
      toast.error('Seleccioná una sucursal para abrir la caja')
      return
    }
    if (!openingForm.opening_balance || parseFloat(openingForm.opening_balance) < 0) {
      toast.error('Por favor ingresa un saldo inicial válido')
      return
    }
    if (!user?.id) {
      toast.error('No se pudo obtener el usuario actual')
      return
    }

    const bid = Number(currentBranchId)
    try {
      await openCashRegister({
        branch_id: bid,
        user_id: Number(user.id),
        opening_balance: parseFloat(openingForm.opening_balance),
        notes: openingForm.notes,
      })

      setOpenCashRegisterDialog(false)
      setOpeningForm({ opening_balance: '', notes: '' })
      
      // Mostrar mensaje de éxito antes de recargar
      toast.success('Caja abierta exitosamente. Recargando página...')
      
      // Recargar la página para asegurar que no queden datos de la caja anterior
      setTimeout(() => {
        window.location.reload()
      }, 1000) // Pequeño delay para que se vea el toast de éxito
      
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const handleCloseCashRegister = async () => {
    if (!currentRegister) return

    if (!closingForm.closing_balance || parseFloat(closingForm.closing_balance) < 0) {
      toast.error('Por favor ingresa un saldo de cierre válido')
      return
    }

    try {
      await closeCashRegister(currentRegister.id, {
        closing_balance: parseFloat(closingForm.closing_balance),
        notes: closingForm.notes,
      })

      setOpenCloseCashDialog(false)
      setClosingForm({ closing_balance: '', notes: '' })
      
      // Recargar la caja actual para actualizar el estado (abierta/cerrada)
      if (currentBranchId && Number.isFinite(currentBranchId)) {
        await loadCurrentCashRegister(Number(currentBranchId))
      }
      
      // Recargar historial para la sucursal actual
      if (currentBranchId && Number.isFinite(currentBranchId)) {
        await loadRegisterHistory(Number(currentBranchId))
      }
      
      // Forzar actualización del componente de estado
      setStatusRefreshKey(prev => prev + 1)
      
      toast.success('Caja cerrada exitosamente')
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const handleAddMovement = async () => {
    if (!currentRegister) {
      toast.error('No hay una caja abierta')
      return
    }

    if (!movementForm.movement_type_id || !movementForm.payment_method_id || !movementForm.amount || !movementForm.description) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (parseFloat(movementForm.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!user?.id) {
      toast.error('No se pudo obtener el usuario current')
      return
    }

    setIsPageLoading(true)
    try {
      // 1. Agrega el nuevo movimiento a la base de datos y actualiza la lista local
      await addMovement({
        cash_register_id: currentRegister.id,
        movement_type_id: parseInt(movementForm.movement_type_id),
        payment_method_id: parseInt(movementForm.payment_method_id),
        amount: parseFloat(movementForm.amount),
        description: movementForm.description,
        user_id: Number(user.id),
      }, { page: movementsPage, perPage: movementsPerPage })

      // 2. Vuelve a solicitar los datos optimizados del backend y recargar todos los movimientos para estadísticas
      await refetchOptimized()
      await loadAllMovements(currentRegister.id)

      // 3. Cierra el diálogo y resetea el formulario
      setOpenNewMovementDialog(false)
      setMovementForm({ movement_type_id: '', payment_method_id: '', amount: '', description: '' })

      // 4. Notifica al usuario que todo salió bien
      toast.success('Movimiento agregado y saldos actualizados.')
    } catch (error) {
      // El error ya se maneja en el hook, así que no es necesario hacer nada más aquí.
    } finally {
      setIsPageLoading(false)
    }
  }

  const handleDeleteMovement = async (movementId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return

    if (!currentRegister) return

    try {
      await deleteMovement(movementId, { page: movementsPage, perPage: movementsPerPage })
      // Recargar todos los movimientos para actualizar estadísticas
      await loadAllMovements(currentRegister.id)
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  // Ver detalle de venta desde un movimiento (modal)
  const handleViewSaleFromMovement = async (movement: any) => {
    let saleId = movement?.reference_id || movement?.metadata?.sale_id || null
    
    // Si no hay saleId, intentar extraerlo de la descripción
    if (!saleId && movement.description) {
      const match = movement.description.match(/#(\d{8})/);
      if (match) {
        saleId = match[1]; // Extraer el número de venta sin el #
      }
    }
    
    if (!saleId) {
      toast.info('Este movimiento no está vinculado a una venta')
      return
    }
    
    try {
      const response = await request({ method: 'GET', url: `/sales/${saleId}` })
      const sale = (response as any)?.data || response
      if (!sale) throw new Error('Venta no encontrada')
      setSelectedSale(sale)
      setSaleDialogOpen(true)
    } catch (e: any) {
      console.error('Error al cargar venta:', e)
      toast.error(e?.response?.data?.message || 'No se pudo cargar el detalle de la venta')
    }
  }

  // Función para abrir el detalle de orden de compra desde movimiento
  function handleViewPurchaseOrderFromMovement(movement: any) {
    const purchaseOrderId = movement?.reference_id
    if (purchaseOrderId) {
      setSelectedPurchaseOrderId(purchaseOrderId)
      setOpenPurchaseOrderDialog(true)
    }
  }

  // Los movimientos ya vienen filtrados del backend según la pestaña activa

  // Filtrar movimientos por tipo seleccionado
  const filteredMovements = movementTypeFilter === "all"
    ? (movements || [])
    : (movements || []).filter(movement => movement.movement_type?.id === parseInt(movementTypeFilter))

  const formatCurrency = (amount: number) => {
    // Asegurar que el valor es un número válido
    const validAmount = isNaN(amount) ? 0 : amount
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(validAmount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch {
      return dateString
    }
  }

  const getCustomerName = (sale: any) => {
    return sale.customer_name || 
      (sale.customer?.person 
        ? `${sale.customer.person.first_name} ${sale.customer.person.last_name}`.trim()
        : 'Consumidor Final')
  }

  const getReceiptType = (sale: any) => {
    return {
      displayName: sale.receiptType?.name || sale.receipt_type?.name || 'Venta',
      afipCode: sale.receiptType?.afip_code || sale.receipt_type?.afip_code || '0',
    }
  }

  const getPaymentMethod = (movement: any) => {
    // Si existe la relación paymentMethod, usarla (PRIORITARIO)
    if (movement.payment_method?.name) {
      // Usar detección optimizada del backend si está disponible
      if (isCashPaymentMethod(movement.payment_method.name)) {
        return 'Efectivo'
      }
      return movement.payment_method.name
    }
    
    // Fallback a lógica tradicional si no hay datos optimizados
    const description = movement.description.toLowerCase()
    
    // Mapeo de palabras clave a métodos de pago (mantenido por compatibilidad)
    const paymentMethodKeywords = {
      'Efectivo': ['efectivo'],
      'Tarjeta Débito': ['tarjeta de débito', 'débito'],
      'Tarjeta Crédito': ['tarjeta de crédito', 'crédito'],
      'Transferencia': ['transferencia'],
      'Mercado Pago': ['mercado pago', 'mp'],
      'Tarjeta': ['tarjeta']
    }
    
    // Buscar coincidencias en la descripción
    for (const [methodName, keywords] of Object.entries(paymentMethodKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return methodName
      }
    }
    
    // Para movimientos de venta sin método especificado
    if (movement.movement_type?.id === 1) {
      return 'No especificado'
    }
    
    // Para gastos y otros movimientos manuales, verificar si es movimiento en efectivo
    if (movement.movement_type?.is_cash_movement === true) {
      return 'Efectivo'
    }
    
    // Para movimientos sin especificar, verificar tipo en la descripción
    const typeDescription = movement.movement_type?.description.toLowerCase() || ''
    if (typeDescription.includes('gasto') || 
        typeDescription.includes('depósito') || 
        typeDescription.includes('retiro')) {
      return 'Efectivo'
    }
    
    return 'No especificado'
  }

  // Refrescar datos (caja actual + historial)
  const handleRefresh = async () => {
    if (!currentBranchId || !Number.isFinite(currentBranchId)) return
    const bid = Number(currentBranchId)
    setIsPageLoading(true)
    // Fallback: reset loading after 10s in case of async hang
    const loadingTimeout = setTimeout(() => {
      setIsPageLoading(false)
      toast.error('La actualización de caja tardó demasiado, intenta de nuevo.')
    }, 10000)
    try {
      // Usar refresh optimizado del backend
      refetchOptimized()

      await loadCurrentCashRegister(bid)
      await loadRegisterHistory(bid)
      // Reset a primera página
      if (currentRegister?.id) {
        await loadMovements(currentRegister.id, 1, movementsPerPage)
        await loadAllMovements(currentRegister.id) // Cargar todos los movimientos para estadísticas
        setMovementsPage(1)
      }
      toast.success('Datos de caja actualizados')
    } catch (error) {
      // Los errores ya se notifican dentro de los hooks
    } finally {
      clearTimeout(loadingTimeout)
      setIsPageLoading(false)
    }
  }

  // Recargar caja al volver el foco a la ventana (para captar ventas/recargas hechas en otras vistas)
  useEffect(() => {
    const onFocus = () => {
      if (!currentBranchId || !Number.isFinite(currentBranchId)) return
      const bid = Number(currentBranchId)
      loadCurrentCashRegister(bid)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [currentBranchId, loadCurrentCashRegister])

  const calculateCashOnlyBalance = () => {
    // Usar datos optimizados del backend si están disponibles
    if (optimizedCashRegister?.expected_cash_balance !== undefined) {
      return optimizedCashRegister.expected_cash_balance
    }
    
    // Fallback a cálculo tradicional si no están disponibles
    if (!currentRegister) return 0
    
    const opening = parseFloat(currentRegister.initial_amount) || 0
    
    // Filtrar solo movimientos en efectivo usando la función centralizada
    const cashMovements = movements.filter(movement => {
      const paymentMethod = getPaymentMethod(movement)
      return paymentMethod === 'Efectivo'
    })
    
    const cashTotal = cashMovements.reduce((total, movement) => {
      const amount = parseFloat(movement.amount) || 0
      const opRaw = (movement.movement_type as any)?.operation_type
      const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
      return total + (isIncome ? Math.abs(amount) : -Math.abs(amount))
    }, 0)
    
    return opening + cashTotal
  }

  // Render condicional al inicio del componente
  if (!currentBranchId) {
    return <SelectBranchPlaceholder />;
  }

  if (isPageLoading || optimizedLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando sistema de caja...</p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Caja</h2>
        <div className="flex gap-2">
          {/* Botón para refrescar datos */}
          <Button variant="outline" onClick={handleRefresh} title="Actualizar">
            <RefreshCcw className="mr-2 h-4 w-4" />
          </Button>
          {/* Botón para abrir caja (solo si no hay caja abierta) */}
          {!currentRegister && (
            <Dialog open={openCashRegisterDialog} onOpenChange={setOpenCashRegisterDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Wallet className="mr-2 h-4 w-4" />
                  Abrir Caja
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Abrir Caja</DialogTitle>
                  <DialogDescription>
                    Ingresa el saldo inicial para abrir una nueva sesión de caja.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="opening-balance">Saldo Inicial</Label>
                    <Input
                      id="opening-balance"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={openingForm.opening_balance}
                      onChange={(e) => setOpeningForm(prev => ({ ...prev, opening_balance: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opening-notes">Observaciones (Opcional)</Label>
                    <Textarea
                      id="opening-notes"
                      placeholder="Observaciones sobre la apertura de caja"
                      value={openingForm.notes}
                      onChange={(e) => setOpeningForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCashRegisterDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleOpenCashRegister} disabled={hookLoading}>
                    {hookLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Abriendo...
                      </>
                    ) : (
                      'Abrir Caja'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Botón para nuevo movimiento (solo si hay caja abierta) */}
          {currentRegister && (
            <Dialog open={openNewMovementDialog} onOpenChange={setOpenNewMovementDialog}>
              <DialogTrigger asChild>
                <Button disabled={!currentRegister}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Movimiento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Movimiento de Caja</DialogTitle>
                  <DialogDescription>
                    Ingresa los detalles del movimiento de entrada o salida de dinero.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="movement-type">Tipo de Movimiento</Label>
                    <Select
                      value={movementForm.movement_type_id}
                      onValueChange={(value) => setMovementForm(prev => ({ ...prev, movement_type_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo de movimiento" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {movementTypes
                          .filter((type) => {
                            // Filtrar movimientos manuales, excluir automáticos
                            const typeName = type.description?.toLowerCase() || ''
                            
                            // Excluir movimientos automáticos por nombre
                            const isAutomaticMovement = 
                              typeName.includes('venta') || 
                              typeName.includes('compra de mercadería') ||
                              typeName.includes('compra de mercaderia') ||
                              typeName.includes('pago de cuenta corriente') ||
                              typeName.includes('pago cuenta corriente')
                            
                            // Incluir solo movimientos manuales (los que no son automáticos)
                            return !isAutomaticMovement
                          })
                          .map((type) => {
                            const op = String(((type as any)?.operation_type ?? ((type as any)?.is_income ? 'entrada' : 'salida'))).toLowerCase()
                            const label = op === 'entrada' ? '(Entrada)' : '(Salida)'
                            return (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.description} {label}
                              </SelectItem>
                            )
                          })}
                        {movementTypes
                          .filter((type) => {
                            const typeName = type.description?.toLowerCase() || ''
                            const isAutomaticMovement = 
                              typeName.includes('venta') || 
                              typeName.includes('compra de mercadería') ||
                              typeName.includes('compra de mercaderia')
                            return !isAutomaticMovement
                          }).length === 0 && (
                          <SelectItem value="no-movement-types" disabled>No hay tipos de movimiento disponibles</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Método de Pago</Label>
                    <Select
                      value={movementForm.payment_method_id}
                      onValueChange={(value) => setMovementForm(prev => ({ ...prev, payment_method_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un método de pago" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {paymentMethods.length === 0 && (
                          <SelectItem value="no-payment-methods" disabled>No hay métodos de pago disponibles</SelectItem>
                        )}
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movement-amount">Cantidad</Label>
                    <Input
                      id="movement-amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={movementForm.amount}
                      onChange={(e) => setMovementForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movement-description">Descripción</Label>
                    <Textarea
                      id="movement-description"
                      placeholder="Descripción del movimiento"
                      value={movementForm.description}
                      onChange={(e) => setMovementForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNewMovementDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddMovement} disabled={hookLoading}>
                    {hookLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Movimiento'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Botón para cerrar caja (solo si hay caja abierta) */}
          {currentRegister && (
            <Dialog open={openCloseCashDialog} onOpenChange={setOpenCloseCashDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Wallet className="mr-2 h-4 w-4" />
                  Cerrar Caja
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Cerrar Caja</DialogTitle>
                  <DialogDescription>Ingresa los detalles para cerrar la caja actual.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Información de Apertura</Label>
                    <div className="bg-blue-50 p-3 rounded-md space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Caja:</span>
                        <span>{currentRegister.branch?.description || 'Caja Principal'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Apertura:</span>
                        <span>{formatDate(currentRegister.opened_at)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Operador:</span>
                        <span>{currentRegister.user?.full_name || currentRegister.user?.username || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Monto Inicial:</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(currentRegister.initial_amount) || 0)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Desglose por método de pago */}
                  <div className="space-y-2">
                    <Label>
                      Desglose por Método de Pago (Sistema)
                    </Label>
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      {(() => {
                        const opening = parseFloat(currentRegister.initial_amount) || 0
                        let paymentBreakdown: Record<string, number> = {}
                        
                        // Usar datos optimizados del backend si están disponibles
                        if (optimizedCashRegister?.payment_method_totals) {
                          paymentBreakdown = { ...optimizedCashRegister.payment_method_totals }
                          
                          // Agregar saldo inicial al efectivo
                          if (paymentBreakdown['Efectivo']) {
                            paymentBreakdown['Efectivo'] += opening
                          } else if (opening > 0) {
                            paymentBreakdown['Efectivo'] = opening
                          }
                        } else {
                          // Fallback: calcular manualmente como antes
                          paymentBreakdown = movements.reduce((acc, movement) => {
                            const paymentMethod = getPaymentMethod(movement)
                            
                            if (!acc[paymentMethod]) acc[paymentMethod] = 0
                            
                            const amount = parseFloat(movement.amount) || 0
                            const opRaw = (movement.movement_type as any)?.operation_type
                            const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
                            
                            acc[paymentMethod] += isIncome ? Math.abs(amount) : -Math.abs(amount)
                            
                            return acc
                          }, {} as Record<string, number>)
                          
                          // Agregar saldo inicial solo al efectivo
                          if (paymentBreakdown['Efectivo']) {
                            paymentBreakdown['Efectivo'] += opening
                          } else if (opening > 0) {
                            paymentBreakdown['Efectivo'] = opening
                          }
                        }
                        
                        return Object.entries(paymentBreakdown)
                          .filter(([_, amount]) => Math.abs(amount) > 0.01) // Filtrar montos muy pequeños
                          .sort(([a], [b]) => {
                            // Ordenar: Efectivo primero, luego alfabético
                            if (a === 'Efectivo') return -1
                            if (b === 'Efectivo') return 1
                            return a.localeCompare(b)
                          })
                          .map(([method, amount]) => (
                            <div key={method} className="flex justify-between items-center text-sm">
                              <span className={method === 'Efectivo' ? 'font-semibold text-green-700' : ''}>{method}:</span>
                              <span className={`font-medium ${amount >= 0 ? 'text-green-600' : 'text-red-600'} ${method === 'Efectivo' ? 'font-semibold' : ''}`}>
                                {amount >= 0 ? formatCurrency(amount) : `-${formatCurrency(Math.abs(amount))}`}
                              </span>
                            </div>
                          ))
                      })()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="final-amount">Efectivo Contado (Conteo Físico)</Label>
                    <Input
                      id="final-amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={closingForm.closing_balance}
                      onChange={(e) => setClosingForm(prev => ({ ...prev, closing_balance: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3" /> Ingresa la cantidad de efectivo que contaste físicamente en la caja
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing-notes">Observaciones</Label>
                    <Textarea
                      id="closing-notes"
                      placeholder="Observaciones sobre el cierre de caja"
                      value={closingForm.notes}
                      onChange={(e) => setClosingForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  {/* Mostrar diferencia si se ha ingresado un monto de cierre */}
                  {closingForm.closing_balance && (
                    <div className="space-y-2">
                      <Label>Diferencia de Efectivo</Label>
                      {(() => {
                        const finalAmount = parseFloat(closingForm.closing_balance) || 0
                        const systemBalance = calculateCashOnlyBalance()
                        const difference = finalAmount - systemBalance
                        
                        return (
                          <div>
                            <p className={`text-sm font-medium ${
                              Math.abs(difference) < 0.01
                                ? 'text-blue-600' 
                                : difference > 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                            }`}>
                              {formatCurrency(difference)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              {Math.abs(difference) < 0.01 ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-blue-600" />
                                  Perfecto! El conteo coincide con el sistema
                                </>
                              ) : difference > 0 ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                  Hay más efectivo del esperado (sobrante)
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-3 w-3 text-red-600" />
                                  Hay menos efectivo del esperado (faltante)
                                </>
                              )}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCloseCashDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCloseCashRegister} disabled={hookLoading}>
                    {hookLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Cerrar Caja'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!currentRegister && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay una caja abierta actualmente. Debes abrir una caja para comenzar a registrar movimientos.
          </AlertDescription>
        </Alert>
      )}

      <CashRegisterStatusBadge 
        key={`cash-status-${statusRefreshKey}`}
        branchId={currentBranchId}
        compact={true}
        showOperator={false}
        showOpenTime={false}
        showRefreshButton={false}
        showOpenButton={false}
        className="mb-4"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Balance Esperado"  
          value={formatCurrency(calculateCashOnlyBalance())}
          description={
            optimizedCashRegister?.expected_cash_balance !== undefined 
              ? "Efectivo que debería haber en caja " 
              : currentRegister 
                ? "Cálculo basado en movimientos de efectivo" 
                : "Sin caja abierta"
          }
          icon={Coins}
          colorClass="bg-orange-100 text-orange-700"
        />
        <StatCard
          title="Entradas de hoy"
          value={formatCurrency(calculateTodayIncome())}
          description="Total de ingresos de esta sesión de caja"
          icon={ArrowDownIcon}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Salidas de hoy"
          value={formatCurrency(calculateTodayExpenses())}
          description="Total de egresos de esta sesión de caja"
          icon={ArrowUpIcon}
          colorClass="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Saldo desde apertura"
          value={formatCurrency(calculateBalanceSinceOpening())}
          description={currentRegister ? `Desde ${formatDate(currentRegister.opened_at)}` : 'Sin caja abierta'}
          icon={DollarSign}
          colorClass="bg-violet-100 text-violet-700"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="dailyreports">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reportes y Cajas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar movimientos..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setMovementsPage(1)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentRegister?.id) {
                      loadMovements(currentRegister.id, 1, movementsPerPage, searchTerm)
                      const sp = new URLSearchParams(searchParams)
                      sp.set('page', '1')
                      sp.set('per_page', String(movementsPerPage))
                      sp.set('q', searchTerm)
                      setSearchParams(sp, { replace: true })
                    }
                  }}
                />
              </div>
              <Select
                value={movementTypeFilter}
                onValueChange={(value) => {
                  setMovementTypeFilter(value)
                  setMovementsPage(1)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {movementTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table ref={movementsTableRef}>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader
                    columnId="type"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                  >
                    Tipo
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="description"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                  >
                    Descripción
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="method"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Método
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="date"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Fecha
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="amount"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                    className="text-right"
                  >
                    Monto
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="user"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Usuario
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="actions"
                    getResizeHandleProps={getMovementsResizeHandleProps}
                    getColumnHeaderProps={getMovementsColumnHeaderProps}
                    className="text-center"
                  >
                    Acciones
                  </ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!currentRegister && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Wallet className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                        <span className="text-muted-foreground">No hay una caja abierta</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {currentRegister && filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                        <span className="text-muted-foreground">No se encontraron movimientos</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredMovements.map((movement) => {
                  const amount = parseFloat(movement.amount) || 0
                  const opRaw = (movement.movement_type as any)?.operation_type
                  const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
                  const userLabel = movement.user?.name || movement.user?.full_name || movement.user?.username || movement.user?.email || 'N/A'
                  const isSaleRef = (movement as any)?.reference_type === 'sale' && 
                    ((movement as any)?.reference_id || (movement as any)?.metadata?.sale_id) ||
                    movement.description.includes('Venta #')
                  // Nueva lógica para orden de compra
                  const isPurchaseOrderRef = (movement as any)?.reference_type === 'purchase_order' && (movement as any)?.reference_id
                  // Limpiar " - Pago: ..." de la descripción
                  const cleanedDescription = typeof movement.description === 'string'
                    ? movement.description.replace(/\s*-\s*Pago:\s*.*/i, '')
                    : movement.description
                  // Usar el tipo desde backend
                  const typeLabel = movement.movement_type?.description || 'N/A'
                  return (
                    <TableRow key={movement.id}>
                      {/* Columna ID eliminada */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isIncome
                              ? "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                              : "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700"
                          }
                        >
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{cleanedDescription}</TableCell>
                      <TableCell className="hidden md:table-cell">{getPaymentMethod(movement)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(movement.created_at)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={isIncome ? 'text-green-600' : 'text-red-600'}>
                          {isIncome ? '+' : '-'} {formatCurrency(Math.abs(amount))}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {userLabel}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isSaleRef && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSaleFromMovement(movement)}
                              title="Ver detalle de venta"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {isPurchaseOrderRef && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPurchaseOrderFromMovement(movement)}
                              title="Ver orden de compra"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMovement(movement.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {/* Paginación para movimientos */}
          {currentRegister && (
            <Pagination
              currentPage={movementsMeta.currentPage}
              lastPage={movementsMeta.lastPage}
              total={movementsMeta.total}
              itemName="movimientos"
              onPageChange={setMovementsPage}
              disabled={isPageLoading || hookLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="dailyreports" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              {/* Se eliminó el input de búsqueda para cierres de caja */}
            </div>
          </div>

          <div className="rounded-md border">
            <Table ref={historyTableRef}>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader
                    columnId="status"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                  >
                    Estado
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="opening"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="hidden   :table-cell"
                  >
                    Apertura
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="closing"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Cierre
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="initial_amount"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="text-right"
                  >
                    Monto Inicial
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="system_amount"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="text-right"
                  >
                    <span title="Monto que debería haber según movimientos del sistema">
                      Sistema
                    </span>
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="counted_cash"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="text-right"
                  >
                    Efectivo Contado
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="difference"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="text-right hidden md:table-cell"
                  >
                    <span title="Diferencia entre efectivo contado y lo que debería haber según movimientos del sistema">
                      Diferencia
                    </span>
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="user"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Usuario
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="observations"
                    getResizeHandleProps={getHistoryResizeHandleProps}
                    getColumnHeaderProps={getHistoryColumnHeaderProps}
                    className="hidden lg:table-cell"
                  >
                    Observaciones
                  </ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registerHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                        <span className="text-muted-foreground">No se encontraron registros de caja</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {pagedRegisterHistory.map((register) => {
                  const openingBalance = parseFloat((register as any).opening_balance || register.initial_amount) || 0
                  const closingBalance = parseFloat(((register as any).closing_balance || (register as any).final_amount || '0')) || 0
                  
                  // Usar datos pre-calculados del backend cuando estén disponibles
                  let expectedCashBalance = openingBalance
                  let difference = 0
                  
                  // Si es la caja actual, usar datos optimizados si están disponibles
                  if (currentRegister && register.id === currentRegister.id && optimizedCashRegister) {
                    expectedCashBalance = optimizedCashRegister.expected_cash_balance || calculateCashOnlyBalance()
                    difference = optimizedCashRegister.cash_difference !== undefined 
                      ? optimizedCashRegister.cash_difference 
                      : closingBalance - expectedCashBalance
                  } else {
                    // Para cajas cerradas, usar valores pre-calculados del backend
                    expectedCashBalance = (register as any).calculated_expected_cash_balance || 
                                        (register as any).expected_cash_balance || 
                                        openingBalance
                    difference = (register as any).calculated_cash_difference || 
                               (register as any).cash_difference || 
                               (closingBalance - expectedCashBalance)
                  }
                  
                  return (
                    <TableRow key={register.id}>
                      <ResizableTableCell
                        columnId="status"
                        getColumnCellProps={getHistoryColumnCellProps}
                      >
                        <Badge className={register.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="opening"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        <span className="truncate" title={formatDate(register.opened_at)}>
                          {formatDate(register.opened_at)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="closing"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        <span className="truncate" title={register.closed_at ? formatDate(register.closed_at as string) : '-'}>
                          {register.closed_at ? formatDate(register.closed_at as string) : '-'}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="initial_amount"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="text-right"
                      >
                        <span className="truncate" title={formatCurrency(openingBalance)}>
                          {formatCurrency(openingBalance)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="system_amount"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="text-right font-medium text-blue-600"
                      >
                        <span className="truncate" title={formatCurrency(expectedCashBalance)}>
                          {formatCurrency(expectedCashBalance)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="counted_cash"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="text-right"
                      >
                        <span className="truncate" title={formatCurrency(closingBalance)}>
                          {formatCurrency(closingBalance)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="difference"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className={`text-right hidden md:table-cell font-semibold ${
                          Math.abs(difference) < 0.01
                            ? "text-blue-600"
                            : difference > 0
                              ? "text-green-600"
                              : "text-red-600"
                        }`}
                      >
                        <span className="truncate" title={formatCurrency(difference)}>
                          {formatCurrency(difference)}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="user"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="hidden md:table-cell"
                      >
                        <span className="truncate" title={(register as any)?.user?.name || (register as any)?.user?.full_name || (register as any)?.user?.username || 'N/A'}>
                          {(register as any)?.user?.name || (register as any)?.user?.full_name || (register as any)?.user?.username || 'N/A'}
                        </span>
                      </ResizableTableCell>
                      <ResizableTableCell
                        columnId="observations"
                        getColumnCellProps={getHistoryColumnCellProps}
                        className="hidden lg:table-cell"
                      >
                        <span className="truncate" title={(register as any)?.closing_notes || (register as any)?.notes || ''}>
                          {(register as any)?.closing_notes || (register as any)?.notes || 
                           (register.status === 'open' ? '-' : 'Sin observaciones')}
                        </span>
                      </ResizableTableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {/* Paginación para historial de cajas */}
          <Pagination
            currentPage={registerHistoryPage}
            lastPage={registerHistoryTotalPages}
            total={registerHistory.length}
            itemName="registros de caja"
            onPageChange={setRegisterHistoryPage}
            disabled={isPageLoading || hookLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de detalle de venta */}
      <ViewSaleDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        sale={selectedSale}
        getCustomerName={getCustomerName}
        formatDate={(d) => {
          if (!d) return 'N/A'
          return new Date(d).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        }}
        getReceiptType={getReceiptType}
        onDownloadPdf={async (sale) => {
          if (!sale || !sale.id) {
            alert("No se puede descargar el PDF: ID de venta faltante.");
            return;
          }
          try {
            const response = await request({ 
              method: 'GET', 
              url: `/pos/sales/${sale.id}/pdf`,
              responseType: 'blob'
            });
            if (!response || !(response instanceof Blob)) {
              throw new Error("La respuesta del servidor no es un archivo PDF válido.");
            }
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
            const receiptNumber = sale.receipt_number || sale.id;
            const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al descargar PDF");
          }
        }}
      />

      {/* Modal de detalle de orden de compra */}
      <ViewPurchaseOrderDialog
        open={openPurchaseOrderDialog}
        onOpenChange={setOpenPurchaseOrderDialog}
        purchaseOrderId={selectedPurchaseOrderId}
      />
    </div>
  )
}
