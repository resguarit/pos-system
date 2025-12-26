import { useMemo } from "react"
import { getPaymentMethod } from "@/utils/cash-register-utils"

interface UseCashCalculationsProps {
  currentRegister?: any
  movements?: any[]
  allMovements?: any[]
  optimizedCashRegister?: any
  selectedBranchIdsArray: number[]
  multipleCashRegisters: Record<number, any>
  consolidatedStats: any
  isCashPaymentMethod?: (name: string) => boolean
}

/**
 * Utilidades para cálculos de caja
 */
const CashCalculationUtils = {
  /**
   * Obtiene la fecha en formato YYYY-MM-DD
   */
  getDateString: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toISOString().split('T')[0]
  },

  /**
   * Determina si un movimiento es de ingreso
   */
  isIncomeMovement: (movement: any): boolean => {
    const opRaw = movement.movement_type?.operation_type
    if (typeof opRaw === 'string') {
      return opRaw.toLowerCase() === 'entrada'
    }
    return !!(movement.movement_type?.is_income)
  },

  /**
   * Obtiene el monto absoluto de un movimiento
   */
  getMovementAmount: (movement: any): number => {
    return Math.abs(parseFloat(movement.amount) || 0)
  },

  /**
   * Verifica si un movimiento afecta el balance de caja
   */
  affectsBalance: (movement: any): boolean => {
    return movement.affects_balance !== false
  },

  /**
   * Verifica si un movimiento afecta el efectivo
   */
  affectsCash: (movement: any): boolean => {
    const mt = movement.movement_type
    return mt?.affects_cash ?? mt?.is_cash_movement ?? true
  },

  /**
   * Filtra movimientos por fecha y caja según la lógica de negocio
   * - Si la caja se abrió hoy: filtra por caja actual y fecha de hoy
   * - Si la caja se abrió otro día: solo filtra por fecha de hoy
   */
  filterTodayMovements: (
    movements: any[],
    currentRegister: any,
    today: string
  ): any[] => {
    if (!currentRegister || !movements.length) return []

    const openedAtDate = CashCalculationUtils.getDateString(currentRegister.opened_at)
    const isOpenedToday = openedAtDate === today

    return movements.filter(movement => {
      // Si la caja se abrió hoy, solo contar movimientos de esta caja
      if (isOpenedToday && movement.cash_register_id !== currentRegister.id) {
        return false
      }

      // Filtrar por fecha de hoy
      const movementDate = CashCalculationUtils.getDateString(movement.created_at)
      return movementDate === today
    })
  }
}

export const useCashCalculations = ({
  currentRegister,
  movements = [],
  allMovements = [],
  optimizedCashRegister,
  selectedBranchIdsArray,
  multipleCashRegisters,
  consolidatedStats,
  isCashPaymentMethod
}: UseCashCalculationsProps) => {

  /**
   * Calcula el balance esperado de efectivo
   * Para múltiples sucursales: usa estadísticas consolidadas del backend
   * Para una sola sucursal: calcula basado en saldo inicial + movimientos de efectivo
   */
  const calculateCashOnlyBalance = useMemo(() => {
    return () => {
      // Múltiples sucursales: usar datos consolidados del backend
      if (selectedBranchIdsArray.length > 1) {
        if (consolidatedStats?.total_balance !== undefined) {
          return consolidatedStats.total_balance
        }

        // Fallback: sumar saldos iniciales de todas las sucursales
        return selectedBranchIdsArray.reduce((total, branchId) => {
          const branchCashRegister = multipleCashRegisters[branchId]
          if (!branchCashRegister) return total
          return total + (parseFloat(branchCashRegister.initial_amount) || 0)
        }, 0)
      }

      // Una sola sucursal: usar datos optimizados del backend si están disponibles
      if (optimizedCashRegister?.expected_cash_balance !== undefined) {
        return optimizedCashRegister.expected_cash_balance
      }

      // Fallback: calcular manualmente
      if (!currentRegister) return 0

      const opening = parseFloat(currentRegister.initial_amount) || 0
      const cashMovements = movements.filter(movement => {
        const paymentMethod = getPaymentMethod(movement, isCashPaymentMethod)
        return paymentMethod === 'Efectivo'
      })

      const cashTotal = cashMovements.reduce((total, movement) => {
        const amount = CashCalculationUtils.getMovementAmount(movement)
        const isIncome = CashCalculationUtils.isIncomeMovement(movement)
        return total + (isIncome ? amount : -amount)
      }, 0)

      return opening + cashTotal
    }
  }, [currentRegister, movements, optimizedCashRegister, selectedBranchIdsArray, multipleCashRegisters, isCashPaymentMethod])

  /**
   * Calcula los ingresos del día actual
   * - Si la caja se abrió hoy: solo cuenta movimientos de esta caja
   * - Si la caja se abrió otro día: cuenta todos los movimientos de hoy
   */
  const calculateTodayIncome = useMemo(() => {
    return () => {
      // Usar valores optimizados del backend si están disponibles
      if (optimizedCashRegister?.total_income !== undefined) {
        return optimizedCashRegister.total_income
      }
      if (optimizedCashRegister?.today_income !== undefined) {
        return optimizedCashRegister.today_income
      }

      const sourceMovements = (allMovements?.length ? allMovements : movements) || []
      if (!currentRegister || !sourceMovements.length) return 0

      const today = CashCalculationUtils.getDateString(new Date())
      const todayMovements = CashCalculationUtils.filterTodayMovements(
        sourceMovements,
        currentRegister,
        today
      )

      return todayMovements.reduce((total, movement) => {
        if (!CashCalculationUtils.affectsBalance(movement)) return total
        if (!CashCalculationUtils.isIncomeMovement(movement)) return total

        return total + CashCalculationUtils.getMovementAmount(movement)
      }, 0)
    }
  }, [currentRegister, movements, allMovements, optimizedCashRegister])

  /**
   * Calcula los egresos del día actual
   * - Si la caja se abrió hoy: solo cuenta movimientos de esta caja
   * - Si la caja se abrió otro día: cuenta todos los movimientos de hoy
   */
  const calculateTodayExpenses = useMemo(() => {
    return () => {
      // Usar valores optimizados del backend si están disponibles
      if (optimizedCashRegister?.total_expenses !== undefined) {
        return optimizedCashRegister.total_expenses
      }
      if (optimizedCashRegister?.today_expenses !== undefined) {
        return optimizedCashRegister.today_expenses
      }

      const sourceMovements = (allMovements?.length ? allMovements : movements) || []
      if (!currentRegister || !sourceMovements.length) return 0

      const today = CashCalculationUtils.getDateString(new Date())
      const todayMovements = CashCalculationUtils.filterTodayMovements(
        sourceMovements,
        currentRegister,
        today
      )

      return todayMovements.reduce((total, movement) => {
        if (!CashCalculationUtils.affectsBalance(movement)) return total
        if (CashCalculationUtils.isIncomeMovement(movement)) return total

        return total + CashCalculationUtils.getMovementAmount(movement)
      }, 0)
    }
  }, [currentRegister, movements, allMovements, optimizedCashRegister])

  /**
   * Calcula el saldo desde la apertura de la caja
   * Incluye el saldo inicial más todos los movimientos desde la apertura
   */
  const calculateBalanceSinceOpening = useMemo(() => {
    return () => {
      const sourceMovements = (allMovements?.length ? allMovements : movements) || []
      if (!currentRegister || !sourceMovements.length) {
        return parseFloat(currentRegister?.initial_amount) || 0
      }

      const opening = parseFloat(currentRegister.initial_amount) || 0
      const openedAt = new Date(currentRegister.opened_at).getTime()

      const totalMovements = sourceMovements
        .filter(movement => {
          const movementTime = new Date(movement.created_at).getTime()
          return movementTime >= openedAt && CashCalculationUtils.affectsBalance(movement)
        })
        .reduce((total, movement) => {
          const amount = CashCalculationUtils.getMovementAmount(movement)
          const isIncome = CashCalculationUtils.isIncomeMovement(movement)
          return total + (isIncome ? amount : -amount)
        }, 0)

      return opening + totalMovements
    }
  }, [currentRegister, movements, allMovements])

  /**
   * Helper para verificar si hay estadísticas consolidadas disponibles
   */
  const hasConsolidatedStats = useMemo(() => {
    return selectedBranchIdsArray.length > 1 &&
      consolidatedStats &&
      Object.keys(consolidatedStats).length > 0
  }, [selectedBranchIdsArray.length, consolidatedStats])

  /**
   * Calcula el balance total para múltiples sucursales
   * Usa estadísticas consolidadas del backend si están disponibles
   */
  const calculateMultipleBranchesBalance = useMemo(() => {
    return () => {
      if (hasConsolidatedStats) {
        return consolidatedStats.total_balance || 0
      }
      return calculateCashOnlyBalance()
    }
  }, [hasConsolidatedStats, consolidatedStats, calculateCashOnlyBalance])

  /**
   * Calcula los ingresos totales para múltiples sucursales
   * Usa estadísticas consolidadas del backend si están disponibles
   */
  const calculateMultipleBranchesIncome = useMemo(() => {
    return () => {
      if (hasConsolidatedStats) {
        return consolidatedStats.total_income || 0
      }
      return calculateTodayIncome()
    }
  }, [hasConsolidatedStats, consolidatedStats, calculateTodayIncome])

  /**
   * Calcula los egresos totales para múltiples sucursales
   * Usa estadísticas consolidadas del backend si están disponibles
   */
  const calculateMultipleBranchesExpenses = useMemo(() => {
    return () => {
      if (hasConsolidatedStats) {
        return consolidatedStats.total_expenses || 0
      }
      return calculateTodayExpenses()
    }
  }, [hasConsolidatedStats, consolidatedStats, calculateTodayExpenses])

  /**
   * Calcula el saldo total para múltiples sucursales
   * Usa estadísticas consolidadas del backend si están disponibles
   */
  const calculateMultipleBranchesSaldo = useMemo(() => {
    return () => {
      if (hasConsolidatedStats) {
        return consolidatedStats.total_saldo || 0
      }
      return calculateBalanceSinceOpening()
    }
  }, [hasConsolidatedStats, consolidatedStats, calculateBalanceSinceOpening])

  return {
    calculateCashOnlyBalance,
    calculateTodayIncome,
    calculateTodayExpenses,
    calculateBalanceSinceOpening,
    calculateMultipleBranchesBalance,
    calculateMultipleBranchesIncome,
    calculateMultipleBranchesExpenses,
    calculateMultipleBranchesSaldo
  }
}
