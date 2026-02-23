import { useState, useCallback } from 'react'
import useApi from './useApi'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type {
  CashRegister,
  CashMovement,
  MovementType,
  CreateMovementRequest,
  MovementPaginationOptions,
  MovementsPaginationMeta,
  OpenCashRegisterRequest,
  CloseCashRegisterRequest
} from '@/types/cash-register.types'

interface UseCashRegisterReturn {
  // Estado
  currentRegister: CashRegister | null
  movements: CashMovement[]
  allMovements: CashMovement[]
  movementsMeta: MovementsPaginationMeta
  movementTypes: MovementType[]
  paymentMethods: any[] // TODO: Create PaymentMethod type
  registerHistory: CashRegister[]
  isLoading: boolean

  // Operaciones
  loadCurrentCashRegister: (branchId: number) => Promise<void>
  openCashRegister: (data: OpenCashRegisterRequest) => Promise<CashRegister>
  closeCashRegister: (registerId: number, data: CloseCashRegisterRequest) => Promise<void>
  addMovement: (data: CreateMovementRequest, opts?: MovementPaginationOptions) => Promise<CashMovement>
  deleteMovement: (movementId: number, opts?: MovementPaginationOptions) => Promise<void>
  loadMovements: (cashRegisterId: number, page?: number, perPage?: number, q?: string, cashOnly?: boolean, movementTypeId?: string) => Promise<void>
  loadAllMovements: (cashRegisterId: number) => Promise<void>
  loadMovementTypes: () => Promise<void>
  loadPaymentMethods: () => Promise<void>
  loadRegisterHistory: (branchId: number, fromDate?: Date, toDate?: Date) => Promise<void>
  loadCashOnlyMovements: (cashRegisterId: number, page?: number, perPage?: number, q?: string) => Promise<void>

  // Cálculos
  calculateBalance: () => number
  calculateTodayIncome: () => number
  calculateTodayExpenses: () => number
  calculateBalanceSinceOpening: () => number
}

export const useCashRegister = (): UseCashRegisterReturn => {
  const { request } = useApi()

  // Estados
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [allMovements, setAllMovements] = useState<CashMovement[]>([])
  const [movementsMeta, setMovementsMeta] = useState<MovementsPaginationMeta>({
    currentPage: 1,
    perPage: 10,
    total: 0,
    lastPage: 1 // Added default value for lastPage
  })
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]) // Añadir estado
  const [registerHistory, setRegisterHistory] = useState<CashRegister[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Cargar caja actual
  // En tu archivo useCashRegister.ts

  // En useCashRegister.ts

  const loadCurrentCashRegister = useCallback(async (branchId: number) => {
    try {
      setIsLoading(true);
      const response = await request({
        method: 'GET',
        url: `/cash-registers/current?branch_id=${branchId}`,
      });

      // 1. CORRECCIÓN: Leemos la ruta correcta al objeto de la caja.
      // La API devuelve el registro dentro de `response.data.data` si es un wrapper, o directamente en `response.data`.
      const registerData = response.data?.data || response.data;

      if (registerData && registerData.id) {
        // 2. RESPONSABILIDAD ÚNICA: Solo actualizamos el estado de la caja.
        setCurrentRegister(registerData);

        // Si la caja está cerrada, limpiar los movimientos
        if (registerData.status !== 'open') {
          setMovements([]);
          setAllMovements([]);
          setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 });
        }

        // 3. LÍNEA ELIMINADA: Ya no llamamos a loadMovements desde aquí.
        // Esto evita la llamada redundante y la condición de carrera.
        // await loadMovements(response.data.id); 

      } else {
        setCurrentRegister(null);
        setMovements([]);
        setAllMovements([]); // Limpiar también allMovements cuando no hay caja
        setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 });
      }
    } catch (error: any) {
      console.error('Error loading current cash register:', error);
      if (error.response?.status !== 404) {
        toast.error('Error al cargar la caja actual');
      }
      setCurrentRegister(null);
      setMovements([]);
      setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [request]); // El array de dependencias queda limpio.

  // Abrir caja
  const openCashRegister = useCallback(async (data: {
    branch_id: number
    user_id: number
    opening_balance: number
    notes?: string
  }) => {
    setIsLoading(true)

    // Limpiar estado anterior inmediatamente
    setCurrentRegister(null)
    setMovements([])
    setAllMovements([]) // Limpiar también allMovements al abrir una nueva caja
    setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })

    try {
      // Mapear opening_balance a initial_amount para el backend
      const backendData = {
        branch_id: data.branch_id,
        user_id: data.user_id,
        initial_amount: data.opening_balance, // Mapear el campo
        notes: data.notes,
      }

      const response = await request({
        method: 'POST',
        url: '/cash-registers/open',
        data: backendData,
      })

      setCurrentRegister(response.data)
      setMovements([])
      setAllMovements([]) // Asegurar que allMovements esté limpio para la nueva caja
      setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
      toast.success('Caja abierta exitosamente')

      return response.data
    } catch (error: any) {
      console.error('Error opening cash register:', error)
      toast.error(error.response?.data?.message || 'Error al abrir la caja')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [request])

  /**
   * Closes a cash register
   * @param registerId - Cash register ID
   * @param data - Closing data (balance and optional notes)
   */
  const closeCashRegister = useCallback(async (
    registerId: number,
    data: CloseCashRegisterRequest
  ): Promise<void> => {
    setIsLoading(true)

    try {
      // Mapear closing_balance a final_amount para el backend
      const backendData = {
        final_amount: data.closing_balance, // Mapear el campo
        notes: data.notes,
      }

      await request({
        method: 'POST',
        url: `/cash-registers/${registerId}/close`,
        data: backendData,
      })

      setCurrentRegister(null)
      setMovements([])
      setAllMovements([]) // Limpiar también allMovements cuando se cierra la caja
      setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
      toast.success('Caja cerrada exitosamente')
    } catch (error: any) {
      console.error('Error closing cash register:', error)
      toast.error(error.response?.data?.message || 'Error al cerrar la caja')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [request])

  /**
   * Extracts movement items from API response
   * NOTA: useApi.request() ya devuelve response.data, no el objeto response completo
   * Entonces apiResponse es directamente el body: { current_page, data: [...], ... } o un array
   */
  const extractMovementsFromApiResponse = (apiResponse: any): CashMovement[] => {
    // Si apiResponse.data es un array (respuesta paginada de Laravel)
    if (Array.isArray(apiResponse?.data)) {
      return apiResponse.data
    }

    // Si apiResponse es directamente un array (respuesta sin paginación)
    if (Array.isArray(apiResponse)) {
      return apiResponse
    }

    return []
  }

  /**
   * Loads all movements for a cash register (for statistics)
   * Uses a high per_page limit to get all movements in one request
   */
  const loadAllMovements = useCallback(async (cashRegisterId: number): Promise<void> => {
    try {
      const params = {
        cash_register_id: cashRegisterId,
        per_page: 10000, // Load all movements
      }

      // IMPORTANTE: useApi.request() ya devuelve response.data
      const apiResponse = await request({
        method: 'GET',
        url: '/cash-movements',
        params,
      })

      const items = extractMovementsFromApiResponse(apiResponse)
      setAllMovements(items)
    } catch (error) {
      console.error('Error loading all cash movements:', error)
      setAllMovements([])
    }
  }, [request])

  const loadMovements = useCallback(async (cashRegisterId: number, page: number = 1, perPage: number = 10, q: string = '', cashOnly: boolean = false, movementTypeId?: string) => {
    try {
      const params: any = {
        cash_register_id: cashRegisterId,
        page: page,
        per_page: perPage,
        q: q || undefined,
      }
      if (cashOnly) {
        params.cash_only = 'true'
      }
      if (movementTypeId && movementTypeId !== 'all') {
        params.movement_type_id = movementTypeId
      }

      // IMPORTANTE: useApi.request() ya devuelve response.data, no el objeto response completo
      // Entonces 'apiResponse' es directamente el body: { current_page, data: [...], last_page, ... }
      const apiResponse = await request({
        method: 'GET',
        url: `/cash-movements`,
        params,
      })

      // Extraer los movimientos del array 'data' dentro de la respuesta paginada
      const items = extractMovementsFromApiResponse(apiResponse)
      setMovements(items)

      // Extraer metadatos de paginación directamente de apiResponse
      // Laravel devuelve: { current_page, data: [...], last_page, per_page, total, ... }
      const meta = {
        currentPage: apiResponse?.current_page ?? page,
        perPage: apiResponse?.per_page ?? perPage,
        total: apiResponse?.total ?? items.length,
        lastPage: apiResponse?.last_page ?? Math.ceil((apiResponse?.total ?? items.length) / (apiResponse?.per_page ?? perPage))
      }

      setMovementsMeta(meta)
    } catch (error) {
      console.error('Error loading cash movements:', error)
      toast.error('Error al cargar los movimientos de caja')
      setMovements([])
      setMovementsMeta({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
    }
  }, [request])

  /**
   * Adds a new movement to the cash register with optimistic update
   * 
   * @param data - Movement data
   * @param opts - Pagination options
   * @returns Created movement
   */
  const addMovement = useCallback(async (
    data: CreateMovementRequest,
    opts?: MovementPaginationOptions
  ): Promise<CashMovement> => {
    setIsLoading(true)

    try {
      const response = await request({
        method: 'POST',
        url: '/cash-movements',
        data,
      })

      toast.success('Movimiento registrado exitosamente')

      // Extract created movement from response
      const newMovement = response?.data?.data || response?.data

      // Optimistic update: Add movement to allMovements if it belongs to current register
      if (newMovement && currentRegister?.id === newMovement.cash_register_id) {
        setAllMovements(prev => {
          // Check if movement already exists (idempotency)
          const exists = prev.some(m => m.id === newMovement.id)
          if (exists) return prev

          // Add to beginning of list (most recent first)
          return [newMovement, ...prev]
        })
      }

      // Reload paginated movements
      await loadMovements(
        data.cash_register_id,
        opts?.page ?? 1,
        opts?.perPage ?? 10,
        opts?.q || '',
        false
      )

      // Reload all movements to ensure complete synchronization
      await loadAllMovements(data.cash_register_id)

      return newMovement
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.response?.data?.message || 'Error al registrar el movimiento'

      console.error('Error adding movement:', error)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [request, loadMovements, loadAllMovements, currentRegister])

  /**
   * Deletes a cash movement
   * @param movementId - Movement ID to delete
   * @param opts - Pagination options
   */
  const deleteMovement = useCallback(async (
    movementId: number,
    opts?: MovementPaginationOptions
  ): Promise<void> => {
    try {
      await request({
        method: 'DELETE',
        url: `/cash-movements/${movementId}`,
      })

      toast.success('Movimiento eliminado exitosamente')

      if (currentRegister) {
        // Recargar movimientos paginados
        await loadMovements(currentRegister.id, opts?.page ?? 1, opts?.perPage ?? 10, opts?.q || '', false)
        // Recargar todos los movimientos para actualizar la tabla
        await loadAllMovements(currentRegister.id)
      }
    } catch (error: any) {
      console.error('Error deleting movement:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar el movimiento')
      throw error
    }
  }, [request, currentRegister, loadMovements, loadAllMovements])

  // Cargar tipos de movimiento
  const loadMovementTypes = useCallback(async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/movement-types',
      })

      const typesData = response.data?.data || response.data || []
      setMovementTypes(Array.isArray(typesData) ? typesData : [])
    } catch (error) {
      console.error('Error loading movement types:', error)
      toast.error('Error al cargar los tipos de movimiento')
      setMovementTypes([])
    }
  }, [request])

  // Cargar métodos de pago
  const loadPaymentMethods = useCallback(async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/payment-methods',
      })

      const methodsData = response.data?.data || response.data || []
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : [])
    } catch (error) {
      console.error('Error loading payment methods:', error)
      toast.error('Error al cargar los métodos de pago')
      setPaymentMethods([])
    }
  }, [request])

  // Cargar historial de cajas
  const loadRegisterHistory = useCallback(async (branchId: number, fromDate?: Date, toDate?: Date) => {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const params: any = { branch_id: branchId }
      if (fromDate) params.from_date = format(fromDate, 'yyyy-MM-dd')
      if (toDate) params.to_date = format(toDate, 'yyyy-MM-dd')

      // Si no se proporcionan fechas, usar últimos 30 días
      if (!fromDate || !toDate) {
        params.from_date = format(thirtyDaysAgo, 'yyyy-MM-dd')
        params.to_date = format(today, 'yyyy-MM-dd')
      }

      const response = await request({
        method: 'GET',
        url: '/cash-registers/history',
        params,
      })

      const payload = response?.data ?? response
      const items = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : []
      setRegisterHistory(items as any[])
    } catch (error) {
      console.error('Error loading register history:', error)
      toast.error('Error al cargar el historial de cajas')
      setRegisterHistory([])
    }
  }, [request])

  // Cargar solo movimientos de efectivo
  const loadCashOnlyMovements = useCallback(async (cashRegisterId: number, page: number = 1, perPage: number = 10, q: string = '') => {
    return loadMovements(cashRegisterId, page, perPage, q, true)
  }, [loadMovements])

  // Calcular balance actual
  const calculateBalance = useCallback(() => {
    // Saldo del día: Entradas de hoy - Salidas de hoy (solo movimientos de hoy)
    const today = format(new Date(), 'yyyy-MM-dd')
    const source = (allMovements?.length ? allMovements : movements) || []

    const totalMovements = source
      .filter(movement => {
        const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd')
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        return movementDate === today && !!affects
      })
      .reduce((total, movement) => {
        const mt = movement.movement_type as any
        const amount = parseFloat(movement.amount) || 0
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income
        return isIncome ? total + Math.abs(amount) : total - Math.abs(amount)
      }, 0)

    return totalMovements
  }, [movements, allMovements])

  // Calcular saldo desde apertura: saldo inicial + (entradas - salidas) desde opened_at
  const calculateBalanceSinceOpening = useCallback(() => {
    if (!currentRegister) return 0
    const openedAtTs = new Date(currentRegister.opened_at).getTime()
    const initial = parseFloat(currentRegister.initial_amount) || 0
    const source = (allMovements?.length ? allMovements : movements) || []

    const netSinceOpen = source
      .filter(movement => {
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        const createdTs = new Date(movement.created_at).getTime()
        return affects && createdTs >= openedAtTs
      })
      .reduce((total, movement) => {
        const mt = movement.movement_type as any
        const amount = parseFloat(movement.amount) || 0
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income
        return isIncome ? total + Math.abs(amount) : total - Math.abs(amount)
      }, 0)

    return initial + netSinceOpen
  }, [currentRegister, movements, allMovements])

  /**
   * Calcula los ingresos del día actual
   * - Si la caja se abrió hoy: solo cuenta movimientos de esta caja
   * - Si la caja se abrió otro día: cuenta todos los movimientos de hoy
   */
  const calculateTodayIncome = useCallback(() => {
    if (!currentRegister) return 0

    const today = format(new Date(), 'yyyy-MM-dd')
    const openedAtDate = format(new Date(currentRegister.opened_at), 'yyyy-MM-dd')
    const isOpenedToday = openedAtDate === today

    const source = (allMovements?.length ? allMovements : movements) || []
    return source
      .filter(movement => {
        // Si la caja se abrió hoy, solo contar movimientos de esta caja
        if (isOpenedToday && movement.cash_register_id !== currentRegister.id) {
          return false
        }

        const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd')
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income

        return movementDate === today && affects && isIncome
      })
      .reduce((total, movement) => total + Math.abs(parseFloat(movement.amount) || 0), 0)
  }, [currentRegister, movements, allMovements])

  /**
   * Calcula los egresos del día actual
   * - Si la caja se abrió hoy: solo cuenta movimientos de esta caja
   * - Si la caja se abrió otro día: cuenta todos los movimientos de hoy
   */
  const calculateTodayExpenses = useCallback(() => {
    if (!currentRegister) return 0

    const today = format(new Date(), 'yyyy-MM-dd')
    const openedAtDate = format(new Date(currentRegister.opened_at), 'yyyy-MM-dd')
    const isOpenedToday = openedAtDate === today

    const source = (allMovements?.length ? allMovements : movements) || []
    return source
      .filter(movement => {
        // Si la caja se abrió hoy, solo contar movimientos de esta caja
        if (isOpenedToday && movement.cash_register_id !== currentRegister.id) {
          return false
        }

        const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd')
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income

        return movementDate === today && affects && !isIncome
      })
      .reduce((total, movement) => total + Math.abs(parseFloat(movement.amount) || 0), 0)
  }, [currentRegister, movements, allMovements])

  return {
    // Estado
    currentRegister,
    movements,
    allMovements,
    movementsMeta,
    movementTypes,
    paymentMethods,
    registerHistory,
    isLoading,

    // Operaciones
    loadCurrentCashRegister,
    openCashRegister,
    closeCashRegister,
    addMovement,
    deleteMovement,
    loadMovements,
    loadAllMovements,
    loadMovementTypes,
    loadPaymentMethods,
    loadRegisterHistory,
    loadCashOnlyMovements,

    // Cálculos
    calculateBalance,
    calculateTodayIncome,
    calculateTodayExpenses,
    calculateBalanceSinceOpening,
  }
}

export default useCashRegister
