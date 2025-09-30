import { useState, useCallback } from 'react'
import useApi from './useApi'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Tipos de datos
interface CashRegister {
  id: number
  branch_id: number
  user_id: number
  opened_at: string
  closed_at?: string
  initial_amount: string // usamos este campo del backend
  closing_balance?: string
  status: 'open' | 'closed'
  notes?: string
  branch?: {
    id: number
    description: string
  }
  user?: {
    id: number
    username?: string
    full_name?: string
  }
}

interface CashMovement {
  id: number
  cash_register_id: number
  movement_type_id: number
  payment_method_id?: number
  amount: string
  description: string
  user_id: number
  reference_type?: string
  reference_id?: number
  created_at: string
  movement_type?: {
    id: number
    code: string
    description: string
    affects_cash?: boolean
    is_cash_movement?: boolean
    is_income?: boolean
    operation_type?: 'entrada' | 'salida' | string
  }
  payment_method?: {
    id: number
    name: string
    description?: string
    is_active?: boolean
  }
  user?: {
    id: number
    name?: string
    username?: string
    full_name?: string
    email?: string
  }
}

interface MovementType {
  id: number
  code: string
  description: string
  affects_cash?: boolean
  is_cash_movement?: boolean
  is_income?: boolean
  operation_type?: 'entrada' | 'salida' | string
}

interface MovementsPaginationMeta {
  currentPage: number
  perPage: number
  total: number
  lastPage: number // Added lastPage property
}

interface UseCashRegisterReturn {
  // Estado
  currentRegister: CashRegister | null
  movements: CashMovement[]
  movementsMeta: MovementsPaginationMeta
  movementTypes: MovementType[]
  paymentMethods: any[] // Añadir métodos de pago
  registerHistory: CashRegister[]
  isLoading: boolean
  
  // Operaciones
  loadCurrentCashRegister: (branchId: number) => Promise<void>
  openCashRegister: (data: { branch_id: number; user_id: number; opening_balance: number; notes?: string }) => Promise<CashRegister>
  closeCashRegister: (registerId: number, data: { closing_balance: number; notes?: string }) => Promise<void>
  addMovement: (data: { cash_register_id: number; movement_type_id: number; payment_method_id?: number; amount: number; description: string; user_id: number }, opts?: { page?: number; perPage?: number; q?: string }) => Promise<void>
  deleteMovement: (movementId: number, opts?: { page?: number; perPage?: number; q?: string }) => Promise<void>
  loadMovements: (cashRegisterId: number, page?: number, perPage?: number, q?: string, cashOnly?: boolean) => Promise<void>
  loadAllMovements: (cashRegisterId: number) => Promise<void>
  loadMovementTypes: () => Promise<void>
  loadPaymentMethods: () => Promise<void> // Añadir función
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
        
        // 3. LÍNEA ELIMINADA: Ya no llamamos a loadMovements desde aquí.
        // Esto evita la llamada redundante y la condición de carrera.
        // await loadMovements(response.data.id); 

      } else {
        setCurrentRegister(null);
        setMovements([]);
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

  // Cerrar caja
  const closeCashRegister = useCallback(async (registerId: number, data: { 
    closing_balance: number
    notes?: string 
  }) => {
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

  // Cargar movimientos (no paginado)
  // Función para cargar TODOS los movimientos de la caja (para estadísticas)
  const loadAllMovements = useCallback(async (cashRegisterId: number) => {
    try {
      const params: any = {
        cash_register_id: cashRegisterId,
        per_page: 10000, // Cargar todos los movimientos
      }

      const response = await request({
        method: 'GET',
        url: `/cash-movements`,
        params,
      })

      const items = Array.isArray(response?.data) ? response.data : []
      setAllMovements(items)
    } catch (error) {
      console.error('Error loading all cash movements:', error)
      setAllMovements([])
    }
  }, [request])

  const loadMovements = useCallback(async (cashRegisterId: number, page: number = 1, perPage: number = 10, q: string = '', cashOnly: boolean = false) => {
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
      const response = await request({
        method: 'GET',
        url: `/cash-movements`,
        params,
      })
      
      // Los metadatos de paginación están en response, los datos en response.data
      const items = Array.isArray(response?.data) ? response.data : []
      setMovements(items)
      
      // Los metadatos de paginación están en el nivel superior de response
      const meta = {
        currentPage: response?.current_page || page,
        perPage: response?.per_page || perPage,
        total: response?.total || items.length,
        lastPage: response?.last_page || Math.ceil((response?.total || items.length) / perPage)
      }
      setMovementsMeta(meta)
    } catch (error) {
      console.error('Error loading cash movements:', error)
      toast.error('Error al cargar los movimientos de caja')
      setMovements([])
      setMovementsMeta({ currentPage: 1, perPage: 10000, total: 0, lastPage: 1 })
    }
  }, [request])

  // Agregar movimiento
  const addMovement = useCallback(async (data: {
    cash_register_id: number
    movement_type_id: number
    amount: number
    description: string
    user_id: number
  }, opts?: { page?: number; perPage?: number; q?: string }) => {
    setIsLoading(true)
    try {
      await request({
        method: 'POST',
        url: '/cash-movements',
        data,
      })

      toast.success('Movimiento registrado exitosamente')
      
      await loadMovements(data.cash_register_id, opts?.page ?? 1, opts?.perPage ?? 10, opts?.q || '', false)
    } catch (error: any) {
      console.error('Error adding movement:', error)
      toast.error(error.response?.data?.message || 'Error al registrar el movimiento')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [request, loadMovements])

  // Eliminar movimiento
  const deleteMovement = useCallback(async (movementId: number, opts?: { page?: number; perPage?: number; q?: string }) => {
    try {
      await request({
        method: 'DELETE',
        url: `/cash-movements/${movementId}`,
      })

      toast.success('Movimiento eliminado exitosamente')
      
      if (currentRegister) {
        await loadMovements(currentRegister.id, opts?.page ?? 1, opts?.perPage ?? 10, opts?.q || '', false)
      }
    } catch (error: any) {
      console.error('Error deleting movement:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar el movimiento')
      throw error
    }
  }, [request, currentRegister, loadMovements])

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

  // Calcular ingresos del día
  const calculateTodayIncome = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const source = (allMovements?.length ? allMovements : movements) || []
    return source
      .filter(movement => {
        const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd')
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income
        return movementDate === today && affects && isIncome
      })
      .reduce((total, movement) => total + Math.abs(parseFloat(movement.amount) || 0), 0)
  }, [movements, allMovements])

  // Calcular egresos del día
  const calculateTodayExpenses = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const source = (allMovements?.length ? allMovements : movements) || []
    return source
      .filter(movement => {
        const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd')
        const mt = movement.movement_type as any
        const affects = mt?.affects_cash ?? mt?.is_cash_movement ?? true
        const op = typeof mt?.operation_type === 'string' ? mt.operation_type.toLowerCase() : undefined
        const isIncome = op ? op === 'entrada' : !!mt?.is_income
        return movementDate === today && affects && !isIncome
      })
      .reduce((total, movement) => total + Math.abs(parseFloat(movement.amount) || 0), 0)
  }, [movements, allMovements])

  return {
    // Estado
    currentRegister,
    movements,
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
