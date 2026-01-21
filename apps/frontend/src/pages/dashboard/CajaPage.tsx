/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef } from "react"
import { format, startOfWeek, startOfMonth, subDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
  FileText,
  PlusCircle,
  Search,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCcw,
  ArrowLeft,
  Coins,
  BarChart3,
  Clock,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useCashRegister from "@/hooks/useCashRegister"
import useCashRegisterOptimized from "@/hooks/useCashRegisterOptimized"
import { useMultipleBranchesCash } from "@/hooks/useMultipleBranchesCash"
import { useCashCalculations } from "@/hooks/useCashCalculations"
import { useCashRegistersHistory } from "@/hooks/useCashRegistersHistory"
import { useMultiBranchFilters } from "@/hooks/useMultiBranchFilters"
import { toast } from "sonner"
import ViewSaleDialog from "@/components/view-sale-dialog"
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import { ViewPurchaseOrderDialog } from "@/components/view-purchase-order-dialog"
import useApi from "@/hooks/useApi"
import { useSearchParams } from "react-router-dom"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/context/AuthContext"
import CashRegisterStatusBadge from "@/components/cash-register-status-badge"
import SelectBranchPlaceholder from "@/components/ui/select-branch-placeholder"
import { DatePickerWithRange, DateRange } from "@/components/ui/date-range-picker"

// Componentes extraídos
import { StatCard } from "@/components/cash/StatCard"
import { CashRegisterStatusCard } from "@/components/cash/CashRegisterStatusCard"
import { OpenCashRegisterDialog } from "@/components/cash/OpenCashRegisterDialog"
import { CloseCashRegisterDialog } from "@/components/cash/CloseCashRegisterDialog"
import { NewMovementDialog } from "@/components/cash/NewMovementDialog"
import { MovementsTable } from "@/components/cash/MovementsTable"
import { MultiBranchNewMovementDialog } from "@/components/cash/MultiBranchNewMovementDialog"
import { MultiBranchFilters } from "@/components/cash/MultiBranchFilters"
import { ExportDialog } from "@/components/cash/ExportDialog"
import { PaymentBreakdownGrid } from "@/components/cash/PaymentBreakdownGrid"
import { calculatePaymentMethodTotals } from "@/utils/payment-breakdown-utils"

// Utilidades
import {
  formatCurrency,
  formatDate,
  getCustomerName,
  getReceiptType,
  extractSaleIdFromDescription
} from "@/utils/cash-register-utils"
import { filterCashMovementTypes } from "@/utils/movementTypeFilters"

export default function CajaPage() {

  // Hook personalizado para manejar la caja
  const {
    currentRegister,
    movements,
    allMovements: allMovementsFromRegister,
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
    loadMovements,
    loadAllMovements,
    movementsMeta,
  } = useCashRegister()

  const { request } = useApi()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedBranchIds, selectionChangeToken, branches, setSelectedBranchIds } = useBranch()
  const { user, hasPermission } = useAuth()

  // Derivar permisos necesarios para la gestión de caja
  const canOpenCloseCashRegister = hasPermission('abrir_cerrar_caja')
  const canViewMovements = hasPermission('ver_movimientos_caja')
  const canCreateMovements = hasPermission('crear_movimientos_caja')
  const canDeleteMovements = hasPermission('eliminar_movimientos_caja')
  const canViewHistory = hasPermission('ver_historico_caja')

  // Derivar branches seleccionadas desde el contexto
  const selectedBranchIdsArray = useMemo(() =>
    selectedBranchIds?.map(id => parseInt(String(id), 10)).filter(Number.isFinite) || [],
    [selectedBranchIds]
  )

  // Función para obtener información de una sucursal específica
  const getBranchInfo = (branchId: number) => {
    return branches.find(branch => branch.id === branchId || branch.id === String(branchId))
  }
  const currentBranchId = selectedBranchIdsArray[0]

  // Hook optimizado con datos pre-calculados del backend
  const {
    currentCashRegister: optimizedCashRegister,
    loading: optimizedLoading,
    refetch: refetchOptimized,
    isCashPaymentMethod
  } = useCashRegisterOptimized(currentBranchId || null)

  // Hook para múltiples sucursales
  const {
    multipleCashRegisters,
    multipleCashRegistersLoading,
    allMovements,
    allMovementsLoading,
    consolidatedStats,
    loadCashRegisterForBranch,
    loadMultipleBranchesData,
    pagination
  } = useMultipleBranchesCash({ selectedBranchIdsArray })

  // Hook para historial de cajas
  const {
    cashRegistersHistory,
    loading: cashRegistersHistoryLoading,
    loadCashRegistersHistory
  } = useCashRegistersHistory({ selectedBranchIdsArray })

  // Determinar qué movimientos usar para cálculos (allMovements para una sucursal, allMovements de múltiples para varias)
  const movementsForCalculations = useMemo(() => {
    if (selectedBranchIdsArray.length > 1) {
      // Para múltiples sucursales, usar allMovements del hook useMultipleBranchesCash
      return allMovements
    } else {
      // Para una sola sucursal, usar allMovements del hook useCashRegister
      return allMovementsFromRegister || []
    }
  }, [selectedBranchIdsArray.length, allMovements, allMovementsFromRegister])

  // Hook para cálculos
  const {
    calculateCashOnlyBalance,
    calculateTodayIncome,
    calculateTodayExpenses,
    calculateBalanceSinceOpening,
    calculateMultipleBranchesBalance,
    calculateMultipleBranchesIncome,
    calculateMultipleBranchesExpenses,
    calculateMultipleBranchesSaldo
  } = useCashCalculations({
    currentRegister,
    movements,
    allMovements: movementsForCalculations,
    optimizedCashRegister,
    selectedBranchIdsArray,
    multipleCashRegisters,
    consolidatedStats,
    isCashPaymentMethod
  })

  // Usar valores optimizados si están disponibles, o fallback a cálculo manual (solo si es necesario para compatibilidad)
  // NOTA: optimizedCashRegister ahora trae total_income y total_expenses pre-calculados
  const todayIncome = optimizedCashRegister?.total_income ?? optimizedCashRegister?.today_income ?? calculateTodayIncome()
  const todayExpenses = optimizedCashRegister?.total_expenses ?? optimizedCashRegister?.today_expenses ?? calculateTodayExpenses()

  // Determinar si la caja se abrió hoy para mostrar títulos dinámicos
  const isOpenedToday = useMemo(() => {
    if (!currentRegister) return false
    const today = new Date().toISOString().split('T')[0]
    const openedAtDate = new Date(currentRegister.opened_at).toISOString().split('T')[0]
    return openedAtDate === today
  }, [currentRegister])

  // Títulos y descripciones dinámicos según el contexto
  const { incomeTitle, expensesTitle, incomeDescription, expensesDescription } = useMemo(() => {
    return {
      incomeTitle: isOpenedToday ? "Entradas" : "Entradas de hoy",
      expensesTitle: isOpenedToday ? "Salidas" : "Salidas de hoy",
      incomeDescription: isOpenedToday
        ? "Total de ingresos de la caja actual"
        : "Total de ingresos de hoy (todas las cajas)",
      expensesDescription: isOpenedToday
        ? "Total de egresos de la caja actual"
        : "Total de egresos de hoy (todas las cajas)"
    }
  }, [isOpenedToday])

  // Estados de UI
  const [openNewMovementDialog, setOpenNewMovementDialog] = useState(false)
  const [openCashRegisterDialog, setOpenCashRegisterDialog] = useState(false)
  const [openCloseCashDialog, setOpenCloseCashDialog] = useState(false)
  const [openMultiBranchMovementDialog, setOpenMultiBranchMovementDialog] = useState(false)
  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [selectedBranchForAction, setSelectedBranchForAction] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [multiBranchTab, setMultiBranchTab] = useState("general")
  const [activeTab, setActiveTab] = useState("current")
  const [movementTypeFilter, setMovementTypeFilter] = useState("all")
  const [movementsPage, setMovementsPage] = useState(1)
  const movementsPerPage = 10

  // Modal de detalle de venta
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)

  // Estado para el diálogo de impresión
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<any>(null);

  // Los formularios ahora se manejan dentro de los diálogos

  // Estado para forzar re-render del status badge cuando se cierre la caja
  const [statusRefreshKey, setStatusRefreshKey] = useState(0)

  // Paginación para el historial de cajas
  const [registerHistoryPage, setRegisterHistoryPage] = useState(1)
  const [expandedHistoryRows, setExpandedHistoryRows] = useState<Set<number>>(new Set())
  const registerHistoryPerPage = 5
  const registerHistoryTotalPages = Math.max(1, Math.ceil(registerHistory.length / registerHistoryPerPage))
  const pagedRegisterHistory = registerHistory.slice(
    (registerHistoryPage - 1) * registerHistoryPerPage,
    registerHistoryPage * registerHistoryPerPage
  )

  // Calcular desglose por método de pago de la caja actual usando función utilitaria
  // Incluye el saldo inicial en "Efectivo" para mostrar el total real en caja
  const currentRegisterPaymentBreakdown = useMemo(() => {
    const breakdown = calculatePaymentMethodTotals(allMovementsFromRegister || [])

    // Agregar el saldo inicial al método "Efectivo" para reflejar el total en caja
    const initialAmount = parseFloat(currentRegister?.initial_amount) || 0
    if (initialAmount > 0) {
      const efectivoIndex = breakdown.findIndex(pm =>
        pm.name === 'Efectivo' || pm.name === 'Contado' || pm.name.toLowerCase().includes('efectivo')
      )

      if (efectivoIndex !== -1) {
        // Sumar saldo inicial al ingreso y total de efectivo
        breakdown[efectivoIndex] = {
          ...breakdown[efectivoIndex],
          income: breakdown[efectivoIndex].income + initialAmount,
          total: breakdown[efectivoIndex].total + initialAmount
        }
      } else if (breakdown.length > 0) {
        // Si no hay "Efectivo" en los movimientos, crear una entrada para mostrar el saldo inicial
        breakdown.unshift({
          id: -1, // ID especial para saldo inicial
          name: 'Efectivo',
          income: initialAmount,
          expense: 0,
          total: initialAmount
        })
      }
    }

    return breakdown
  }, [allMovementsFromRegister, currentRegister?.initial_amount])

  // Estado para el diálogo de orden de compra
  const [openPurchaseOrderDialog, setOpenPurchaseOrderDialog] = useState(false)
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<number | null>(null)

  // Estado para recordar la selección original de sucursales
  const [originalBranchSelection, setOriginalBranchSelection] = useState<string[]>([])

  // Ref para controlar la ejecución del useEffect
  const lastSelectionRef = useRef('')

  // Hook para filtros de múltiples sucursales
  const availableBranchesForFilters = useMemo(() =>
    selectedBranchIdsArray.map(branchId => ({
      id: branchId,
      name: getBranchInfo(branchId)?.description || `Sucursal ${branchId}`
    })),
    [selectedBranchIdsArray, branches]
  )

  const {
    searchTerm: multiBranchSearchTerm,
    setSearchTerm: setMultiBranchSearchTerm,
    movementTypeFilter: multiBranchMovementTypeFilter,
    setMovementTypeFilter: setMultiBranchMovementTypeFilter,
    branchFilter,
    setBranchFilter,
    dateRangeFilter,
    setDateRangeFilter,
    customDateRange,
    setCustomDateRange,
    clearAllFilters
  } = useMultiBranchFilters({
    movements: allMovements,
    availableBranches: availableBranchesForFilters
  })

  // Cargar datos cuando haya sucursales seleccionadas o cambie la selección
  useEffect(() => {
    const load = async () => {
      if (selectedBranchIdsArray.length === 0) {
        return
      }

      setIsPageLoading(true)
      try {
        // Cargar datos comunes
        await Promise.all([
          loadMovementTypes(),
          loadPaymentMethods(),
        ])

        // Cargar caja de la primera sucursal (para compatibilidad)
        if (currentBranchId) {
          await loadCurrentCashRegister(currentBranchId)
          if (canViewHistory) {
            await loadRegisterHistory(currentBranchId)
          }
          // Cargar todos los movimientos para el historial
          if (canViewMovements) {
            const backendFilters = {
              date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
              custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
                from: format(customDateRange.from, 'yyyy-MM-dd'),
                to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
              } : undefined,
              search: multiBranchSearchTerm || undefined,
              movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
              branch: branchFilter !== 'all' ? branchFilter : undefined
            }
            await loadMultipleBranchesData(backendFilters)
          }
        }

        if (selectedBranchIdsArray.length > 1) {
          // Para múltiples sucursales, usar el endpoint consolidado

          // Construir filtros para el backend
          const backendFilters = {
            date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
            custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
              from: format(customDateRange.from, 'yyyy-MM-dd'),
              to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
            } : undefined,
            search: multiBranchSearchTerm || undefined,
            movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
            branch: branchFilter !== 'all' ? branchFilter : undefined
          }

          await loadMultipleBranchesData(backendFilters)

          // Cargar cajas individuales para todas las sucursales (incluye las cerradas que no vienen en el consolidado)
          await Promise.all(
            selectedBranchIdsArray.map(branchId =>
              loadCashRegisterForBranch(branchId).catch(err => {
                console.error(`Error loading cash register for branch ${branchId}:`, err)
                return null
              })
            )
          )
        } else {
          // Para una sola sucursal, también usar loadMultipleBranchesData para cargar allMovements
          const branchId = selectedBranchIdsArray[0]

          try {
            const backendFilters = {
              date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
              custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
                from: format(customDateRange.from, 'yyyy-MM-dd'),
                to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
              } : undefined,
              search: multiBranchSearchTerm || undefined,
              movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
              branch: branchFilter !== 'all' ? branchFilter : undefined
            }
            await loadMultipleBranchesData(backendFilters)
            await loadCashRegisterForBranch(branchId)
          } catch (error) {
            console.error('❌ useEffect - Error en loadCashRegisterForBranch para branchId:', branchId, error)
          }
        }

      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Error al cargar los datos de caja')
      } finally {
        setIsPageLoading(false)
      }
    }

    // Solo ejecutar si realmente cambió la selección
    const currentSelection = selectedBranchIdsArray.join(',')

    if (currentSelection !== lastSelectionRef.current) {
      lastSelectionRef.current = currentSelection
      load()
    }
  }, [selectedBranchIdsArray, selectionChangeToken, canViewHistory, loadMovementTypes, loadCurrentCashRegister, loadRegisterHistory, loadMultipleBranchesData, loadCashRegisterForBranch, currentBranchId])

  // Ref para evitar recargas innecesarias de filtros
  const lastFiltersRef = useRef<string>('')

  // Recargar datos cuando cambien los filtros (para múltiples sucursales y monosucursal)
  useEffect(() => {
    if (selectedBranchIdsArray.length > 0) {
      const currentFilters = JSON.stringify({
        date_range: dateRangeFilter,
        custom_dates: customDateRange,
        search: multiBranchSearchTerm,
        movement_type: multiBranchMovementTypeFilter,
        branch: branchFilter,
        page: movementsPage,
        perPage: movementsPerPage
      })

      // Solo recargar si los filtros realmente cambiaron
      if (lastFiltersRef.current !== currentFilters) {
        lastFiltersRef.current = currentFilters

        const backendFilters = {
          date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
          custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
            from: format(customDateRange.from, 'yyyy-MM-dd'),
            to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
          } : undefined,
          search: multiBranchSearchTerm || undefined,
          movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
          branch: branchFilter !== 'all' ? branchFilter : undefined
        }

        loadMultipleBranchesData(backendFilters, movementsPage, movementsPerPage)
      }
    }
  }, [dateRangeFilter, customDateRange, multiBranchSearchTerm, multiBranchMovementTypeFilter, branchFilter, selectedBranchIdsArray.length, movementsPage, movementsPerPage])

  // Cargar historial de cajas cuando cambien los filtros de fecha
  useEffect(() => {
    if (selectedBranchIdsArray.length > 0 && (selectedBranchIdsArray.length > 1 ? multiBranchTab === 'historial-cajas' : activeTab === 'dailyreports')) {

      const backendFilters = {
        date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
          from: format(customDateRange.from, 'yyyy-MM-dd'),
          to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
        } : undefined
      }

      loadCashRegistersHistory(backendFilters)
    }
  }, [dateRangeFilter, customDateRange, selectedBranchIdsArray.length, multiBranchTab, activeTab, loadCashRegistersHistory])

  useEffect(() => {
    // Solo cargar movimientos paginados cuando sea necesario (tab actual)
    if (currentRegister?.id && canViewMovements && activeTab === "current" && selectedBranchIdsArray.length === 1) {
      loadMovements(currentRegister.id, movementsPage, movementsPerPage, searchTerm, false)

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
  }, [currentRegister?.id, movementsPage, movementsPerPage, searchTerm, movementTypeFilter, canViewMovements, activeTab, selectedBranchIdsArray.length])

  // Cargar todos los movimientos cuando currentRegister cambie (para el desglose por método de pago)
  useEffect(() => {
    if (currentRegister?.id && canViewMovements && selectedBranchIdsArray.length === 1) {
      loadAllMovements(currentRegister.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRegister?.id, canViewMovements, selectedBranchIdsArray.length])

  // Efecto para restaurar la selección original cuando el usuario navega a otras páginas
  useEffect(() => {
    return () => {
      // Cleanup: NO restaurar la selección cuando el componente se desmonte
      // La selección debe mantenerse para cuando el usuario regrese
      // Solo limpiar el estado interno
      if (originalBranchSelection.length > 0) {
        // No cambiar selectedBranchIds aquí, solo limpiar el estado interno
        setOriginalBranchSelection([])
      }
    }
  }, []) // Solo ejecutar cuando el componente se desmonte

  // Efecto para detectar cuando el usuario sale del detalle y restaurar selección original
  useEffect(() => {
    // Si estamos en una sola sucursal pero tenemos selección original guardada con múltiples sucursales,
    // significa que el usuario está en el detalle de una caja
    // Cuando el componente se desmonte (navegación a otra página), restaurar la selección
    if (selectedBranchIdsArray.length === 1 && originalBranchSelection.length > 1) {
      // Función de cleanup que se ejecutará cuando el componente se desmonte
      const cleanup = () => {
        setSelectedBranchIds([...originalBranchSelection])
        setOriginalBranchSelection([])
      }

      // Agregar listener para detectar navegación
      const handleBeforeUnload = () => {
        cleanup()
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      // Cleanup del listener cuando el componente se desmonte
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        cleanup() // Ejecutar cleanup al desmontar
      }
    }
  }, [selectedBranchIdsArray.length, originalBranchSelection])

  // Handlers para abrir/cerrar caja
  const handleOpenCashRegister = async (formData: { opening_balance: string; notes: string }) => {
    if (!canOpenCloseCashRegister) {
      toast.error('No tienes permisos para abrir la caja')
      return
    }

    const branchIdToUse = selectedBranchForAction || currentBranchId

    if (!branchIdToUse || !Number.isFinite(branchIdToUse)) {
      toast.error('Seleccioná una sucursal para abrir la caja')
      return
    }
    if (formData.opening_balance === '' || formData.opening_balance === null || formData.opening_balance === undefined || parseFloat(formData.opening_balance) < 0 || isNaN(parseFloat(formData.opening_balance))) {
      toast.error('Por favor ingresa un saldo inicial válido')
      return
    }
    if (!user?.id) {
      toast.error('No se pudo obtener el usuario actual')
      return
    }

    const bid = Number(branchIdToUse)
    try {
      await openCashRegister({
        branch_id: bid,
        user_id: Number(user.id),
        opening_balance: parseFloat(formData.opening_balance),
        notes: formData.notes,
      })

      setOpenCashRegisterDialog(false)
      setSelectedBranchForAction(null)

      toast.success('Caja abierta exitosamente')

      // Recargar datos según el contexto
      if (selectedBranchIdsArray.length > 1) {
        const backendFilters = {
          date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
          custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
            from: format(customDateRange.from, 'yyyy-MM-dd'),
            to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
          } : undefined,
          search: multiBranchSearchTerm || undefined,
          movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
          branch: branchFilter !== 'all' ? branchFilter : undefined
        }
        await loadMultipleBranchesData(backendFilters)
      } else {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }

    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const handleCloseCashRegister = async (formData: { closing_balance: string; notes: string }) => {
    if (!canOpenCloseCashRegister) {
      toast.error('No tienes permisos para cerrar la caja')
      return
    }

    let cashRegisterToClose = currentRegister
    let branchIdToUse = currentBranchId

    if (selectedBranchForAction) {
      cashRegisterToClose = multipleCashRegisters[selectedBranchForAction]
      branchIdToUse = selectedBranchForAction
    }

    if (!cashRegisterToClose) return

    if (formData.closing_balance === '' || formData.closing_balance === null || formData.closing_balance === undefined || parseFloat(formData.closing_balance) < 0 || isNaN(parseFloat(formData.closing_balance))) {
      toast.error('Por favor ingresa un saldo de cierre válido')
      return
    }

    try {
      await closeCashRegister(cashRegisterToClose.id, {
        closing_balance: parseFloat(formData.closing_balance),
        notes: formData.notes,
      })

      setOpenCloseCashDialog(false)
      setSelectedBranchForAction(null)

      // Recargar datos según el contexto
      if (selectedBranchIdsArray.length > 1) {
        const backendFilters = {
          date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
          custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
            from: format(customDateRange.from, 'yyyy-MM-dd'),
            to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
          } : undefined,
          search: multiBranchSearchTerm || undefined,
          movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
          branch: branchFilter !== 'all' ? branchFilter : undefined
        }
        await loadMultipleBranchesData(backendFilters)
      } else {
        if (branchIdToUse && Number.isFinite(branchIdToUse)) {
          await loadCurrentCashRegister(Number(branchIdToUse))
        }

        if (branchIdToUse && Number.isFinite(branchIdToUse) && canViewHistory) {
          await loadRegisterHistory(Number(branchIdToUse))
        }

        setStatusRefreshKey(prev => prev + 1)
      }

      toast.success('Caja cerrada exitosamente')
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  // Funciones para abrir/cerrar cajas desde la vista de múltiples sucursales
  const handleOpenCashRegisterForBranch = (branchId: number) => {
    if (!canOpenCloseCashRegister) {
      toast.error('No tienes permisos para abrir la caja')
      return
    }

    setSelectedBranchForAction(branchId)
    setOpenCashRegisterDialog(true)
  }

  const handleCloseCashRegisterForBranch = (_cashRegisterId: number, branchId: number) => {
    if (!canOpenCloseCashRegister) {
      toast.error('No tienes permisos para cerrar la caja')
      return
    }

    setSelectedBranchForAction(branchId)
    setOpenCloseCashDialog(true)
  }

  // Función para ver detalles de una sucursal específica
  const handleViewBranchDetails = (branchId: number) => {
    if (!branchId || isNaN(branchId)) {
      toast.error('Error: ID de sucursal inválido')
      return
    }

    // Solo guardar la selección original si no se ha guardado antes y si actualmente hay múltiples sucursales
    if (originalBranchSelection.length === 0 && selectedBranchIds.length > 1) {
      setOriginalBranchSelection([...selectedBranchIds])
    }

    const newSelection = [branchId.toString()]

    try {
      setSelectedBranchIds(newSelection)
    } catch (error) {
      toast.error('Error al cambiar la selección de sucursales')
      return
    }

    const branchInfo = getBranchInfo(branchId)

    if (!branchInfo) {
      toast.error(`Error: No se encontró información de la sucursal ${branchId}`)
      return
    }

    const branchName = branchInfo?.description || `Sucursal ${branchId}`

    toast.success(`Viendo detalles de ${branchName}`)
  }

  // Función para volver a la vista de múltiples sucursales
  const handleGoBackToMultipleBranches = () => {
    if (originalBranchSelection.length > 1) {
      setSelectedBranchIds([...originalBranchSelection])
      setOriginalBranchSelection([])
      toast.success('Volviendo a la vista de múltiples sucursales')
    } else {
      const allBranchIds = branches.map(branch => branch.id.toString())
      setSelectedBranchIds(allBranchIds)
      setOriginalBranchSelection([])
      toast.success('Mostrando todas las sucursales')
    }
  }

  const handleAddMovement = async (formData: { movement_type_id: string; payment_method_id: string; amount: string; description: string }) => {
    if (!canCreateMovements) {
      toast.error('No tienes permisos para crear movimientos de caja')
      return
    }

    if (!currentRegister) {
      toast.error('No hay una caja abierta')
      return
    }

    if (!formData.movement_type_id || !formData.payment_method_id || !formData.amount || !formData.description) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!user?.id) {
      toast.error('No se pudo obtener el usuario current')
      return
    }

    setIsPageLoading(true)
    try {
      // addMovement ya actualiza allMovementsFromRegister con optimistic update
      // y luego recarga todos los movimientos para sincronización
      await addMovement({
        cash_register_id: currentRegister.id,
        movement_type_id: parseInt(formData.movement_type_id),
        payment_method_id: parseInt(formData.payment_method_id),
        amount: parseFloat(formData.amount),
        description: formData.description,
        user_id: Number(user.id),
      }, { page: movementsPage, perPage: movementsPerPage })

      // Refrescar el balance optimizado para actualizar las tarjetas de resumen
      await refetchOptimized()

      // No necesitamos delay ni recargar manualmente porque addMovement ya lo hace
      // El optimistic update ya agregó el movimiento a allMovementsFromRegister
      // y loadAllMovements dentro de addMovement asegura sincronización completa

      setOpenNewMovementDialog(false)

      toast.success('Movimiento agregado y saldos actualizados.')
    } catch (error) {
      // El error ya se maneja en el hook
    } finally {
      setIsPageLoading(false)
    }
  }

  // Función para crear movimientos desde múltiples sucursales
  const handleAddMovementFromMultiBranch = async (formData: {
    branch_id: number
    movement_type_id: string
    payment_method_id: string
    amount: string
    description: string
  }) => {
    if (!canCreateMovements) {
      toast.error('No tienes permisos para crear movimientos de caja')
      return
    }

    const targetCashRegister = multipleCashRegisters[formData.branch_id]
    if (!targetCashRegister) {
      toast.error('No hay una caja abierta en la sucursal seleccionada')
      return
    }

    if (!formData.movement_type_id || !formData.payment_method_id || !formData.amount || !formData.description) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!user?.id) {
      toast.error('No se pudo obtener el usuario actual')
      return
    }

    setIsPageLoading(true)
    try {
      // Crear el movimiento usando la API directamente
      await request({
        method: 'POST',
        url: '/cash-movements',
        data: {
          cash_register_id: targetCashRegister.id,
          movement_type_id: parseInt(formData.movement_type_id),
          payment_method_id: parseInt(formData.payment_method_id),
          amount: parseFloat(formData.amount),
          description: formData.description,
          user_id: Number(user.id),
        }
      })

      setOpenMultiBranchMovementDialog(false)

      // Recargar datos consolidados
      const backendFilters = {
        date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
          from: format(customDateRange.from, 'yyyy-MM-dd'),
          to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
        } : undefined
      }
      await loadMultipleBranchesData(backendFilters)

      toast.success(`Movimiento agregado en ${getBranchInfo(formData.branch_id)?.description || `Sucursal ${formData.branch_id}`}`)
    } catch (error: any) {
      console.error('Error creating movement:', error)
      toast.error(error?.response?.data?.message || 'Error al crear el movimiento')
    } finally {
      setIsPageLoading(false)
    }
  }

  const handlePrintReceipt = async (sale: any) => {
    try {
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` })
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response
      setSelectedReceiptSale(fullSale)
      setShowReceiptPreview(true)
    } catch (error) {
      console.error('Error fetching sale details for receipt:', error)
      toast.error('No se pudo cargar el detalle del comprobante')
      setSelectedReceiptSale(sale)
      setShowReceiptPreview(true)
    }
  }

  const handleDeleteMovement = async (movementId: number) => {
    if (!canDeleteMovements) {
      toast.error('No tienes permisos para eliminar movimientos de caja')
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return

    if (!currentRegister) return

    try {
      await deleteMovement(movementId, { page: movementsPage, perPage: movementsPerPage })
      await loadAllMovements(currentRegister.id)
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  // Ver detalle de venta desde un movimiento (modal)
  const handleViewSaleFromMovement = async (movement: any) => {
    let saleId = movement?.reference_id || movement?.metadata?.sale_id || null

    if (!saleId && movement.description) {
      saleId = extractSaleIdFromDescription(movement.description)
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
  const handleViewPurchaseOrderFromMovement = (movement: any) => {
    const purchaseOrderId = movement?.reference_id
    if (purchaseOrderId) {
      setSelectedPurchaseOrderId(purchaseOrderId)
      setOpenPurchaseOrderDialog(true)
    }
  }


  // Funciones de exportación
  const handleExportData = async (format: 'excel' | 'pdf' | 'csv', type: 'movements' | 'summary' | 'comparison', selectedBranches: number[]) => {
    try {
      setIsPageLoading(true)

      const params = {
        branch_ids: selectedBranches,
        format,
        type,
        filters: {
          search: multiBranchSearchTerm,
          movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
          branch: branchFilter !== 'all' ? branchFilter : undefined,
          date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined
        }
      }

      const response = await request({
        method: 'GET',
        url: '/cash-registers/export',
        params,
        responseType: 'blob'
      })

      // Crear y descargar el archivo
      const blob = new Blob([response], {
        type: format === 'pdf' ? 'application/pdf' :
          format === 'excel' ? 'application/vnd.ms-excel' :
            'text/csv'
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const fileExtension = format === 'excel' ? 'xls' : format
      const filename = `reporte_caja_${type}_${timestamp}.${fileExtension}`
      a.download = filename

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Reporte exportado como ${filename}`)
    } catch (error: any) {
      console.error('Error exporting data:', error)
      toast.error(error?.response?.data?.message || 'Error al exportar los datos')
    } finally {
      setIsPageLoading(false)
    }
  }

  // Filtrar movimientos por tipo seleccionado
  // Para una sola sucursal, usar allMovementsFromRegister del hook useCashRegister
  const movementsForFiltering = selectedBranchIdsArray.length > 1
    ? allMovements
    : (currentRegister?.id
      ? (allMovementsFromRegister || []).filter(m => m.cash_register_id === currentRegister.id)
      : [])

  const allFilteredMovements = movementTypeFilter === "all"
    ? movementsForFiltering
    : movementsForFiltering.filter(movement => movement.movement_type?.id === parseInt(movementTypeFilter))

  // Aplicar paginación a los movimientos filtrados
  const startIndex = (movementsPage - 1) * movementsPerPage
  const endIndex = startIndex + movementsPerPage
  const filteredMovements = allFilteredMovements.slice(startIndex, endIndex)

  // Obtener movimientos solo de cajas abiertas para el tab "General"
  const getMovementsFromOpenCashRegisters = useMemo(() => {
    if (selectedBranchIdsArray.length <= 1) return []

    // Obtener solo las cajas que están realmente abiertas
    const openCashRegisters = Object.values(multipleCashRegisters)
      .filter(register => register && register.status === 'open')

    const openCashRegisterIds = openCashRegisters.map(register => register.id)

    // Filtrar movimientos SOLO por cash_register_id de cajas abiertas
    const filteredMovements = allMovements.filter(movement => {
      return openCashRegisterIds.includes(movement.cash_register_id)
    })

    return filteredMovements
  }, [allMovements, multipleCashRegisters, selectedBranchIdsArray.length])

  // Resetear página cuando cambien los filtros (para una o múltiples sucursales)
  useEffect(() => {
    // Si cambiaron los filtros (no la página), resetear a página 1
    if (movementsPage > 1) {
      setMovementsPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeFilter, customDateRange, multiBranchSearchTerm, multiBranchMovementTypeFilter, branchFilter, selectedBranchIdsArray.length])

  // Helper para calcular fechas basado en el filtro
  const calculateDateRange = () => {
    const today = new Date()
    let from: Date | undefined
    let to: Date | undefined

    switch (dateRangeFilter) {
      case 'today':
        from = today
        to = today
        break
      case 'yesterday': {
        const yesterday = subDays(today, 1)
        from = yesterday
        to = yesterday
        break
      }
      case 'week':
        from = startOfWeek(today, { weekStartsOn: 1 })
        to = today
        break
      case 'month':
        from = startOfMonth(today)
        to = today
        break
      case 'custom':
        if (customDateRange?.from) {
          from = customDateRange.from
          to = customDateRange.to || customDateRange.from
        }
        break
    }
    return { from, to }
  }

  // Efecto para recargar el historial cuando cambian los filtros (Single Branch)
  useEffect(() => {
    if (selectedBranchIdsArray.length === 1 && currentBranchId && canViewHistory) {
      const { from, to } = calculateDateRange()
      loadRegisterHistory(currentBranchId, from, to)
    }
  }, [dateRangeFilter, customDateRange, selectedBranchIdsArray.length, currentBranchId, canViewHistory])

  // Refrescar datos (caja actual + historial)
  const handleRefresh = async () => {
    if (selectedBranchIdsArray.length === 0) return

    setIsPageLoading(true)
    const loadingTimeout = setTimeout(() => {
      setIsPageLoading(false)
      toast.error('La actualización de caja tardó demasiado, intenta de nuevo.')
    }, 10000)
    try {
      refetchOptimized()

      // Refrescar caja de la primera sucursal (para compatibilidad)
      if (currentBranchId) {
        await loadCurrentCashRegister(currentBranchId)
        if (canViewHistory) {
          const { from, to } = calculateDateRange()
          await loadRegisterHistory(currentBranchId, from, to)
        }
        if (currentRegister?.id && canViewMovements) {
          await loadMovements(currentRegister.id, 1, movementsPerPage)
          await loadAllMovements(currentRegister.id)
          setMovementsPage(1)
        }
      }

      if (selectedBranchIdsArray.length > 1) {
        const backendFilters = {
          date_range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
          custom_dates: dateRangeFilter === 'custom' && customDateRange?.from ? {
            from: format(customDateRange.from, 'yyyy-MM-dd'),
            to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : format(customDateRange.from, 'yyyy-MM-dd')
          } : undefined,
          search: multiBranchSearchTerm || undefined,
          movement_type: multiBranchMovementTypeFilter !== 'all' ? multiBranchMovementTypeFilter : undefined,
          branch: branchFilter !== 'all' ? branchFilter : undefined
        }
        await loadMultipleBranchesData(backendFilters, movementsPage, movementsPerPage)

        // Cargar cajas individuales para todas las sucursales (incluye las cerradas que no vienen en el consolidado)
        await Promise.all(
          selectedBranchIdsArray.map(branchId =>
            loadCashRegisterForBranch(branchId).catch(err => {
              console.error(`Error loading cash register for branch ${branchId}:`, err)
              return null
            })
          )
        )
      } else {
        await loadCashRegisterForBranch(selectedBranchIdsArray[0])
      }

      toast.success(`Datos de caja actualizados para ${selectedBranchIdsArray.length} sucursal${selectedBranchIdsArray.length > 1 ? 'es' : ''}`)
    } catch (error) {
      // Los errores ya se notifican dentro de los hooks
    } finally {
      clearTimeout(loadingTimeout)
      setIsPageLoading(false)
    }
  }

  // Recargar caja al volver el foco a la ventana
  useEffect(() => {
    const onFocus = () => {
      if (!currentBranchId || !Number.isFinite(currentBranchId)) return
      const bid = Number(currentBranchId)
      loadCurrentCashRegister(bid)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [currentBranchId, loadCurrentCashRegister])

  // Render condicional al inicio del componente
  if (selectedBranchIdsArray.length === 0) {
    return <SelectBranchPlaceholder />
  }

  // Solo mostrar loading principal si hay una sola sucursal o si es el loading inicial
  if (selectedBranchIdsArray.length === 1 && (isPageLoading || optimizedLoading)) {
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
      <div className="space-y-2">
        {/* Breadcrumb para una sola sucursal - Solo mostrar si se vino de múltiples sucursales */}
        {selectedBranchIdsArray.length === 1 && originalBranchSelection.length > 1 && (
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBackToMultipleBranches}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
              title="Volver a vista de múltiples sucursales"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Todas las sucursales</span>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Gestión de Caja
            {selectedBranchIdsArray.length > 1 && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                ({selectedBranchIdsArray.length} sucursales)
              </span>
            )}
            {selectedBranchIdsArray.length === 1 && originalBranchSelection.length > 1 && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                - {getBranchInfo(selectedBranchIdsArray[0])?.description || `Sucursal ${selectedBranchIdsArray[0]}`}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            {/* Botones para una sola sucursal */}
            {selectedBranchIdsArray.length === 1 && (
              <>
                <Button variant="outline" onClick={handleRefresh} title="Actualizar">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                </Button>

                {!currentRegister && canOpenCloseCashRegister && !selectedBranchForAction && (
                  <Button onClick={() => setOpenCashRegisterDialog(true)}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Abrir Caja
                  </Button>
                )}

                {currentRegister && canCreateMovements && (
                  <Button onClick={() => setOpenNewMovementDialog(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Movimiento
                  </Button>
                )}

                {currentRegister && canOpenCloseCashRegister && !selectedBranchForAction && (
                  <Button variant="outline" onClick={() => setOpenCloseCashDialog(true)}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Cerrar Caja
                  </Button>
                )}
              </>
            )}

            {/* Botones para múltiples sucursales */}
            {selectedBranchIdsArray.length > 1 && (
              <>
                <Button variant="outline" onClick={handleRefresh} title="Actualizar todas">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>

                {canCreateMovements && (
                  <Button onClick={() => setOpenMultiBranchMovementDialog(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Movimiento
                  </Button>
                )}


              </>
            )}
          </div>
        </div>
      </div>

      {selectedBranchIdsArray.length === 1 && !currentRegister && !canOpenCloseCashRegister && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay una caja abierta y no tienes permisos para abrir una. Contacta a un administrador.
          </AlertDescription>
        </Alert>
      )}

      {selectedBranchIdsArray.length === 1 && !currentRegister && canOpenCloseCashRegister && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay una caja abierta actualmente. Debes abrir una caja para comenzar a registrar movimientos.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principales para múltiples sucursales */}
      {selectedBranchIdsArray.length > 1 ? (
        <Tabs value={multiBranchTab} onValueChange={setMultiBranchTab} className="space-y-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full sm:w-fit grid-cols-2 sm:grid-cols-4">
              <TabsTrigger
                value="general"
                disabled={!canViewMovements}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="estados"
                disabled={!canOpenCloseCashRegister}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Estados Individuales</span>
              </TabsTrigger>
              <TabsTrigger
                value="historial"
                disabled={!canViewMovements}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Historial de Movimientos</span>
              </TabsTrigger>
              <TabsTrigger
                value="historial-cajas"
                disabled={!canViewHistory}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Historial de Cajas</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
            {!canViewMovements ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver los movimientos de caja.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">General</h3>
                  <p className="text-sm text-gray-600">
                    Vista consolidada de las {selectedBranchIdsArray.length} sucursales seleccionadas con estadísticas y movimientos recientes
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Balance Total (Todas las Sucursales)"
                    value={formatCurrency(calculateMultipleBranchesBalance())}
                    description={`Suma de balances de ${selectedBranchIdsArray.length} sucursales`}
                    icon={Coins}
                    colorClass="text-orange-700"
                  />
                  <StatCard
                    title="Entradas Totales"
                    value={formatCurrency(calculateMultipleBranchesIncome())}
                    description="Total de ingresos de todas las sucursales"
                    icon={ArrowDownIcon}
                    colorClass="text-blue-700"
                  />
                  <StatCard
                    title="Salidas Totales"
                    value={formatCurrency(calculateMultipleBranchesExpenses())}
                    description="Total de egresos de todas las sucursales"
                    icon={ArrowUpIcon}
                    colorClass="text-amber-700"
                  />
                  <StatCard
                    title="Saldo Total"
                    value={formatCurrency(calculateMultipleBranchesSaldo())}
                    description={`Suma de saldos de ${selectedBranchIdsArray.length} sucursales`}
                    icon={DollarSign}
                    colorClass="text-violet-700"
                  />
                </div>


                {/* Movimientos recientes de cajas abiertas */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Historial de Movimientos</h4>
                  <MovementsTable
                    movements={allMovements}
                    loading={allMovementsLoading}
                    canDeleteMovements={false}
                    isCashPaymentMethod={isCashPaymentMethod}
                    getBranchInfo={getBranchInfo}
                    showBranchColumn={true}
                    currentPage={movementsPage}
                    lastPage={pagination?.last_page || 1}
                    total={pagination?.total || 0}
                    onPageChange={(page: number) => {
                      setMovementsPage(page)
                    }}
                    pageLoading={isPageLoading || hookLoading}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="estados" className="space-y-6">
            {!canOpenCloseCashRegister ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para abrir o cerrar cajas.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Estados Individuales de Cajas</h3>
                  <p className="text-sm text-gray-600">
                    Gestión detallada de cada sucursal con opciones de apertura y cierre
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {selectedBranchIdsArray.sort((a, b) => a - b).map(branchId => (
                    <div key={`cash-status-${branchId}-${statusRefreshKey}`} className="relative">
                      {multipleCashRegistersLoading[branchId] && (
                        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm font-medium">Cargando...</span>
                          </div>
                        </div>
                      )}
                      <CashRegisterStatusCard
                        branchId={branchId}
                        cashRegister={multipleCashRegisters[branchId]}
                        canOpenCloseCashRegister={canOpenCloseCashRegister}
                        onRefresh={() => loadCashRegisterForBranch(branchId)}
                        onOpenCashRegister={handleOpenCashRegisterForBranch}
                        onCloseCashRegister={handleCloseCashRegisterForBranch}
                        branchInfo={getBranchInfo(branchId)}
                        onViewBranchDetails={handleViewBranchDetails}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="historial" className="space-y-6">
            {!canViewMovements ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver el historial de movimientos.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Historial de Movimientos</h3>
                    <p className="text-sm text-gray-600">
                      Filtra, analiza y exporta el historial completo de movimientos de todas las sucursales seleccionadas
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setOpenExportDialog(true)}
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>

                {/* Filtros avanzados */}
                <MultiBranchFilters
                  searchTerm={multiBranchSearchTerm}
                  onSearchChange={setMultiBranchSearchTerm}
                  movementTypeFilter={multiBranchMovementTypeFilter}
                  onMovementTypeChange={setMultiBranchMovementTypeFilter}
                  branchFilter={branchFilter}
                  onBranchFilterChange={setBranchFilter}
                  dateRangeFilter={dateRangeFilter}
                  onDateRangeChange={setDateRangeFilter}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={setCustomDateRange}
                  movementTypes={movementTypes}
                  availableBranches={availableBranchesForFilters}
                  onClearFilters={clearAllFilters}
                />

                {/* Tabla de movimientos con paginación completa - TODOS los movimientos de la historia */}
                <MovementsTable
                  movements={selectedBranchIdsArray.length > 1 ? allMovements : filteredMovements}
                  loading={allMovementsLoading}
                  canDeleteMovements={false}
                  isCashPaymentMethod={isCashPaymentMethod}
                  getBranchInfo={getBranchInfo}
                  showBranchColumn={selectedBranchIdsArray.length > 1}
                  currentPage={movementsPage}
                  lastPage={selectedBranchIdsArray.length > 1 ? (pagination?.last_page || 1) : Math.ceil(allFilteredMovements.length / movementsPerPage)}
                  total={selectedBranchIdsArray.length > 1 ? (pagination?.total || 0) : allFilteredMovements.length}
                  onPageChange={(page: number) => {
                    setMovementsPage(page)
                  }}
                  pageLoading={isPageLoading || hookLoading}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="historial-cajas" className="space-y-6">
            {!canViewHistory ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver el historial de cajas.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Historial de Cajas</h3>
                    <p className="text-sm text-gray-600">
                      Consulta el historial de aperturas y cierres de cajas de todas las sucursales seleccionadas
                    </p>
                  </div>
                </div>

                {/* Filtros para historial de cajas */}
                <div className="bg-white p-4 rounded-lg border space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rango de fechas
                      </label>
                      <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar rango" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las fechas</SelectItem>
                          <SelectItem value="today">Hoy</SelectItem>
                          <SelectItem value="yesterday">Ayer</SelectItem>
                          <SelectItem value="week">Esta semana</SelectItem>
                          <SelectItem value="month">Este mes</SelectItem>
                          <SelectItem value="custom">Rango personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {dateRangeFilter === 'custom' && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rango de fechas
                        </label>
                        <DatePickerWithRange
                          className="w-full"
                          selected={customDateRange as DateRange}
                          onSelect={(range) => {
                            if (range) {
                              setCustomDateRange({ from: range.from, to: range.to })
                            } else {
                              setCustomDateRange({ from: undefined, to: undefined })
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de historial de cajas */}
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-gray-900">Registros de Cajas</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sucursal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Apertura
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cierre
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efectivo Inicial
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efectivo Final
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diferencia Efectivo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cashRegistersHistoryLoading ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Cargando historial de cajas...
                              </div>
                            </td>
                          </tr>
                        ) : cashRegistersHistory.length > 0 ? (
                          cashRegistersHistory.map((cashRegister) => {
                            const branchInfo = getBranchInfo(cashRegister.branch_id)
                            const branchColor = branchInfo?.color || '#6b7280'
                            const isExpanded = expandedHistoryRows.has(cashRegister.id)
                            const paymentMethodTotals = cashRegister.payment_method_totals || []

                            const toggleExpand = () => {
                              setExpandedHistoryRows(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(cashRegister.id)) {
                                  newSet.delete(cashRegister.id)
                                } else {
                                  newSet.add(cashRegister.id)
                                }
                                return newSet
                              })
                            }

                            return (
                              <>
                                <tr key={cashRegister.id} className="hover:bg-gray-50 cursor-pointer" onClick={toggleExpand}>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                      <button className="text-gray-500 hover:text-gray-700 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                        ▶
                                      </button>
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: branchColor }}
                                      />
                                      <span className="text-black font-semibold">
                                        {cashRegister.branch_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    {cashRegister.user_name}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    {formatDate(cashRegister.opened_at)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    {cashRegister.closed_at ? formatDate(cashRegister.closed_at) : 'En curso'}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black font-medium">
                                    {formatCurrency(cashRegister.initial_amount || 0)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black font-medium">
                                    {cashRegister.status === 'open' ? '-' : (() => {
                                      const finalAmount = cashRegister.final_amount !== null && cashRegister.final_amount !== undefined
                                        ? parseFloat(String(cashRegister.final_amount))
                                        : null
                                      return finalAmount !== null ? formatCurrency(finalAmount) : '-'
                                    })()}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                    {cashRegister.status === 'open' ? (
                                      '-'
                                    ) : (
                                      (() => {
                                        const expectedAmount = cashRegister.expected_cash_balance !== null && cashRegister.expected_cash_balance !== undefined
                                          ? parseFloat(String(cashRegister.expected_cash_balance))
                                          : 0
                                        const countedAmount = cashRegister.final_amount !== null && cashRegister.final_amount !== undefined
                                          ? parseFloat(String(cashRegister.final_amount))
                                          : null

                                        if (countedAmount === null) {
                                          return <span className="text-gray-500">-</span>
                                        }

                                        const difference = countedAmount - expectedAmount

                                        return (
                                          <span className={`${Math.abs(difference) < 0.01
                                            ? 'text-blue-600'
                                            : difference > 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                            }`}>
                                            {Math.abs(difference) < 0.01
                                              ? 'Sin diferencia'
                                              : difference > 0
                                                ? `+${formatCurrency(difference)} (sobrante)`
                                                : `${formatCurrency(difference)} (faltante)`
                                            }
                                          </span>
                                        )
                                      })()
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cashRegister.status === 'open'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                      }`}>
                                      {cashRegister.status === 'open' ? 'Abierta' : 'Cerrada'}
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && paymentMethodTotals.length > 0 && (
                                  <tr key={`${cashRegister.id}-detail`} className="bg-gray-50">
                                    <td colSpan={8} className="px-8 py-4">
                                      <div className="text-sm">
                                        <h4 className="font-semibold text-gray-700 mb-2">Desglose por Método de Pago</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                          {paymentMethodTotals.map((pm: { id: number; name: string; income: number; expense: number; total: number }) => (
                                            <div key={pm.id} className="bg-white rounded-lg p-3 border">
                                              <div className="font-medium text-gray-900">{pm.name}</div>
                                              <div className="text-green-600">+{formatCurrency(pm.income)}</div>
                                              {pm.expense > 0 && <div className="text-red-600">-{formatCurrency(pm.expense)}</div>}
                                              <div className="font-semibold border-t mt-1 pt-1">Total: {formatCurrency(pm.total)}</div>
                                            </div>
                                          ))}
                                          {/* Total General Card */}
                                          {(() => {
                                            const totalIncome = paymentMethodTotals.reduce((sum: number, pm: { income: number }) => sum + pm.income, 0)
                                            const totalExpense = paymentMethodTotals.reduce((sum: number, pm: { expense: number }) => sum + pm.expense, 0)
                                            const totalNet = totalIncome - totalExpense
                                            return (
                                              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
                                                <div className="font-bold text-white flex items-center gap-1">
                                                  <Wallet className="h-4 w-4 text-yellow-300" /> Total General
                                                </div>
                                                <div className="text-blue-100">Ingresos: +{formatCurrency(totalIncome)}</div>
                                                <div className="text-blue-100">Egresos: -{formatCurrency(totalExpense)}</div>
                                                <div className="font-bold border-t border-blue-400 mt-1 pt-1 text-lg">
                                                  Neto: {formatCurrency(totalNet)}
                                                </div>
                                              </div>
                                            )
                                          })()}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                              No hay registros de cajas para mostrar
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

        </Tabs>
      ) : (
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
      )}

      {/* Tabs de Historial y Reportes - Solo para una sucursal */}
      {selectedBranchIdsArray.length === 1 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full sm:w-fit grid-cols-3">
              <TabsTrigger value="current" disabled={!canViewMovements} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Movimientos Actuales</span>
                <span className="sm:hidden">Actuales</span>
              </TabsTrigger>
              <TabsTrigger value="history" disabled={!canViewMovements} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Historial de Movimientos</span>
                <span className="sm:hidden">Historial</span>
              </TabsTrigger>
              <TabsTrigger value="dailyreports" disabled={!canViewHistory} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Historial de Cajas</span>
                <span className="sm:hidden">Cajas</span>
              </TabsTrigger>
            </TabsList>

            {/* Botón de exportar para monosucursal */}
            {activeTab === "history" && (
              <Button
                variant="outline"
                onClick={() => setOpenExportDialog(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>

          <TabsContent value="current" className="space-y-4">
            {!canViewMovements ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver los movimientos de caja.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Movimientos Actuales</h3>
                  <p className="text-sm text-gray-600">
                    Movimientos de la caja actualmente abierta en esta sucursal
                  </p>
                </div>

                {/* Desglose por Método de Pago - Caja Actual */}
                {currentRegister && currentRegisterPaymentBreakdown.length > 0 && (
                  <PaymentBreakdownGrid
                    paymentMethodTotals={currentRegisterPaymentBreakdown}
                    formatCurrency={formatCurrency}
                  />
                )}

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
                        {filterCashMovementTypes(movementTypes).map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <MovementsTable
                  movements={movements}
                  loading={hookLoading}
                  canDeleteMovements={canDeleteMovements}
                  onViewSale={handleViewSaleFromMovement}
                  onViewPurchaseOrder={handleViewPurchaseOrderFromMovement}
                  onDeleteMovement={handleDeleteMovement}
                  isCashPaymentMethod={isCashPaymentMethod}
                  currentPage={movementsPage}
                  lastPage={movementsMeta.lastPage}
                  total={movementsMeta.total}
                  onPageChange={(page: number) => {
                    setMovementsPage(page)
                  }}
                  pageLoading={isPageLoading || hookLoading}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {!canViewMovements ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver los movimientos de caja.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Historial de Movimientos</h3>
                  <p className="text-sm text-gray-600">
                    Historial completo de movimientos con filtros avanzados y opciones de exportación
                  </p>
                </div>

                {/* Filtros avanzados para monosucursal */}
                <MultiBranchFilters
                  searchTerm={multiBranchSearchTerm}
                  onSearchChange={setMultiBranchSearchTerm}
                  movementTypeFilter={multiBranchMovementTypeFilter}
                  onMovementTypeChange={setMultiBranchMovementTypeFilter}
                  branchFilter={branchFilter}
                  onBranchFilterChange={setBranchFilter}
                  dateRangeFilter={dateRangeFilter}
                  onDateRangeChange={setDateRangeFilter}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={setCustomDateRange}
                  movementTypes={movementTypes}
                  availableBranches={availableBranchesForFilters}
                  onClearFilters={clearAllFilters}
                />

                <MovementsTable
                  movements={allMovements}
                  loading={allMovementsLoading}
                  canDeleteMovements={false}
                  isCashPaymentMethod={isCashPaymentMethod}
                  getBranchInfo={getBranchInfo}
                  showBranchColumn={false}
                  currentPage={movementsPage}
                  lastPage={pagination?.last_page || 1}
                  total={pagination?.total || 0}
                  onPageChange={(page: number) => {
                    setMovementsPage(page)
                  }}
                  pageLoading={isPageLoading || hookLoading}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="dailyreports" className="space-y-4">
            {!canViewHistory ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tienes permisos para ver el historial de cajas.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Historial de Cajas</h3>
                  <p className="text-sm text-gray-600">
                    Consulta el historial de aperturas y cierres de cajas de esta sucursal
                  </p>
                </div>

                {/* Filtros para historial de cajas */}
                <div className="bg-white p-4 rounded-lg border space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rango de fechas
                      </label>
                      <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar rango" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las fechas</SelectItem>
                          <SelectItem value="today">Hoy</SelectItem>
                          <SelectItem value="yesterday">Ayer</SelectItem>
                          <SelectItem value="week">Esta semana</SelectItem>
                          <SelectItem value="month">Este mes</SelectItem>
                          <SelectItem value="custom">Rango personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {dateRangeFilter === 'custom' && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rango de fechas
                        </label>
                        <DatePickerWithRange
                          className="w-full"
                          selected={customDateRange as DateRange}
                          onSelect={(range) => {
                            if (range) {
                              setCustomDateRange({ from: range.from, to: range.to })
                            } else {
                              setCustomDateRange({ from: undefined, to: undefined })
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de historial de cajas */}
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-gray-900">Registros de Cajas</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Apertura
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cierre
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efectivo Inicial
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efectivo Final
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diferencia Efectivo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isPageLoading || hookLoading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Cargando historial de cajas...
                              </div>
                            </td>
                          </tr>
                        ) : pagedRegisterHistory.length > 0 ? (
                          pagedRegisterHistory.map((cashRegister) => {
                            const isExpanded = expandedHistoryRows.has(cashRegister.id)
                            const paymentMethodTotals = (cashRegister as any).payment_method_totals || []

                            const toggleExpand = () => {
                              setExpandedHistoryRows(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(cashRegister.id)) {
                                  newSet.delete(cashRegister.id)
                                } else {
                                  newSet.add(cashRegister.id)
                                }
                                return newSet
                              })
                            }

                            return (
                              <>
                                <tr key={cashRegister.id} className="hover:bg-gray-50 cursor-pointer" onClick={toggleExpand}>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    <div className="flex items-center gap-2">
                                      <button className="text-gray-500 hover:text-gray-700 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                        ▶
                                      </button>
                                      {cashRegister.user?.username || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    {formatDate(cashRegister.opened_at)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                                    {cashRegister.closed_at ? formatDate(cashRegister.closed_at) : 'En curso'}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black font-medium">
                                    {formatCurrency(Number(cashRegister.initial_amount) || 0)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-black font-medium">
                                    {cashRegister.status === 'open' ? '-' : (() => {
                                      const finalAmount = (cashRegister.closing_balance !== null && cashRegister.closing_balance !== undefined) ||
                                        ((cashRegister as any).final_amount !== null && (cashRegister as any).final_amount !== undefined)
                                        ? parseFloat(String(cashRegister.closing_balance || (cashRegister as any).final_amount || '0'))
                                        : null
                                      return finalAmount !== null ? formatCurrency(finalAmount) : '-'
                                    })()}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                    {cashRegister.status === 'open' ? (
                                      '-'
                                    ) : (
                                      (() => {
                                        const expectedAmount = (cashRegister as any).expected_cash_balance !== null && (cashRegister as any).expected_cash_balance !== undefined
                                          ? parseFloat(String((cashRegister as any).expected_cash_balance))
                                          : 0
                                        const countedAmount = (cashRegister.closing_balance !== null && cashRegister.closing_balance !== undefined) ||
                                          ((cashRegister as any).final_amount !== null && (cashRegister as any).final_amount !== undefined)
                                          ? parseFloat(String(cashRegister.closing_balance || (cashRegister as any).final_amount || '0'))
                                          : null

                                        if (countedAmount === null) {
                                          return <span className="text-gray-500">-</span>
                                        }

                                        const difference = countedAmount - expectedAmount

                                        return (
                                          <span className={`${Math.abs(difference) < 0.01
                                            ? 'text-blue-600'
                                            : difference > 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                            }`}>
                                            {Math.abs(difference) < 0.01
                                              ? 'Sin diferencia'
                                              : difference > 0
                                                ? `+${formatCurrency(difference)} (sobrante)`
                                                : `${formatCurrency(difference)} (faltante)`
                                            }
                                          </span>
                                        )
                                      })()
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cashRegister.status === 'open'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                      }`}>
                                      {cashRegister.status === 'open' ? 'Abierta' : 'Cerrada'}
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && paymentMethodTotals.length > 0 && (
                                  <tr key={`${cashRegister.id}-detail`} className="bg-gray-50">
                                    <td colSpan={7} className="px-8 py-4">
                                      <div className="text-sm">
                                        <h4 className="font-semibold text-gray-700 mb-2">Desglose por Método de Pago</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                          {paymentMethodTotals.map((pm: { id: number; name: string; income: number; expense: number; total: number }) => (
                                            <div key={pm.id} className="bg-white rounded-lg p-3 border">
                                              <div className="font-medium text-gray-900">{pm.name}</div>
                                              <div className="text-green-600">+{formatCurrency(pm.income)}</div>
                                              {pm.expense > 0 && <div className="text-red-600">-{formatCurrency(pm.expense)}</div>}
                                              <div className="font-semibold border-t mt-1 pt-1">Total: {formatCurrency(pm.total)}</div>
                                            </div>
                                          ))}
                                          {/* Total General Card */}
                                          {(() => {
                                            const totalIncome = paymentMethodTotals.reduce((sum: number, pm: { income: number }) => sum + pm.income, 0)
                                            const totalExpense = paymentMethodTotals.reduce((sum: number, pm: { expense: number }) => sum + pm.expense, 0)
                                            const totalNet = totalIncome - totalExpense
                                            return (
                                              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
                                                <div className="font-bold text-white flex items-center gap-1">
                                                  <Wallet className="h-4 w-4 text-yellow-300" /> Total General
                                                </div>
                                                <div className="text-blue-100">Ingresos: +{formatCurrency(totalIncome)}</div>
                                                <div className="text-blue-100">Egresos: -{formatCurrency(totalExpense)}</div>
                                                <div className="font-bold border-t border-blue-400 mt-1 pt-1 text-lg">
                                                  Neto: {formatCurrency(totalNet)}
                                                </div>
                                              </div>
                                            )
                                          })()}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                              No hay registros de cajas para mostrar
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {registerHistoryTotalPages > 1 && (
                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Mostrando {((registerHistoryPage - 1) * registerHistoryPerPage) + 1} a {Math.min(registerHistoryPage * registerHistoryPerPage, registerHistory.length)} de {registerHistory.length} registros
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRegisterHistoryPage(prev => Math.max(1, prev - 1))}
                          disabled={registerHistoryPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-gray-700">
                          Página {registerHistoryPage} de {registerHistoryTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRegisterHistoryPage(prev => Math.min(registerHistoryTotalPages, prev + 1))}
                          disabled={registerHistoryPage === registerHistoryTotalPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Diálogos */}
      <ExportDialog
        open={openExportDialog}
        onOpenChange={setOpenExportDialog}
        onExport={handleExportData}
        loading={isPageLoading}
        availableBranches={availableBranchesForFilters}
        selectedBranchIds={selectedBranchIdsArray}
      />

      <OpenCashRegisterDialog
        open={openCashRegisterDialog}
        onOpenChange={setOpenCashRegisterDialog}
        onOpenCashRegister={handleOpenCashRegister}
        loading={hookLoading}
        selectedBranchForAction={selectedBranchForAction}
        branchInfo={getBranchInfo}
        currentBranchId={currentBranchId}
      />

      <CloseCashRegisterDialog
        open={openCloseCashDialog}
        onOpenChange={setOpenCloseCashDialog}
        onCloseCashRegister={handleCloseCashRegister}
        loading={hookLoading}
        currentRegister={currentRegister}
        multipleCashRegisters={multipleCashRegisters}
        selectedBranchForAction={selectedBranchForAction}
        branchInfo={getBranchInfo}
        movements={movements}
        allMovements={movementsForCalculations}
        calculateCashOnlyBalance={calculateCashOnlyBalance}
        isCashPaymentMethod={isCashPaymentMethod}
        optimizedCashRegister={optimizedCashRegister}
      />

      <NewMovementDialog
        open={openNewMovementDialog}
        onOpenChange={setOpenNewMovementDialog}
        onAddMovement={handleAddMovement}
        loading={hookLoading}
        movementTypes={movementTypes}
        paymentMethods={paymentMethods}
      />

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
        onPrintPdf={async (sale) => handlePrintReceipt(sale)}
        onSaleUpdated={(updatedSale) => {
          // Actualizar la venta seleccionada si es la misma
          if (selectedSale && selectedSale.id === updatedSale.id) {
            setSelectedSale(updatedSale);
          }
        }}
      />

      {/* Diálogo de impresión */}
      <SaleReceiptPreviewDialog
        open={showReceiptPreview}
        onOpenChange={setShowReceiptPreview}
        sale={selectedReceiptSale}
        customerName={selectedReceiptSale ? getCustomerName(selectedReceiptSale) : ''}
        customerCuit={selectedReceiptSale?.client?.person?.cuit || selectedReceiptSale?.customer?.person?.cuit}
        formatDate={(d) => {
          if (!d) return 'N/A'
          return new Date(d).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        }}
        formatCurrency={(val) => formatCurrency(Number(val))}
      />

      {/* Modal de detalle de orden de compra */}
      <ViewPurchaseOrderDialog
        open={openPurchaseOrderDialog}
        onOpenChange={setOpenPurchaseOrderDialog}
        purchaseOrderId={selectedPurchaseOrderId}
      />

      {/* Diálogo para nuevo movimiento desde múltiples sucursales */}
      <MultiBranchNewMovementDialog
        open={openMultiBranchMovementDialog}
        onOpenChange={setOpenMultiBranchMovementDialog}
        onAddMovement={handleAddMovementFromMultiBranch}
        loading={isPageLoading}
        movementTypes={movementTypes}
        paymentMethods={paymentMethods}
        availableBranches={selectedBranchIdsArray.map(branchId => ({
          id: branchId,
          name: getBranchInfo(branchId)?.description || `Sucursal ${branchId}`,
          hasOpenCashRegister: multipleCashRegisters[branchId] && multipleCashRegisters[branchId].status === 'open'
        }))}
      />
    </div>
  )
}