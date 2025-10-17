import { useMemo } from "react"
import { getPaymentMethod } from "@/utils/cash-register-utils"

interface UseCashCalculationsProps {
  currentRegister?: any
  movements?: any[]
  optimizedCashRegister?: any
  selectedBranchIdsArray: number[]
  multipleCashRegisters: Record<number, any>
  consolidatedStats: any
  isCashPaymentMethod?: (name: string) => boolean
}

export const useCashCalculations = ({
  currentRegister,
  movements = [],
  optimizedCashRegister,
  selectedBranchIdsArray,
  multipleCashRegisters,
  consolidatedStats,
  isCashPaymentMethod
}: UseCashCalculationsProps) => {

  // Función para calcular balance de efectivo solo
  const calculateCashOnlyBalance = useMemo(() => {
    return () => {
      if (selectedBranchIdsArray.length > 1) {
        // Usar estadísticas consolidadas del backend si están disponibles
        if (consolidatedStats && consolidatedStats.total_balance !== undefined) {
          return consolidatedStats.total_balance
        }
        
        // Fallback: calcular balance total de todas las sucursales
        return selectedBranchIdsArray.reduce((total, branchId) => {
          const branchCashRegister = multipleCashRegisters[branchId]
          if (!branchCashRegister) return total
          
          const opening = parseFloat(branchCashRegister.initial_amount) || 0
          // Por simplicidad, solo sumamos el saldo inicial por ahora
          return total + opening
        }, 0)
      }

      // Lógica original para una sola sucursal
      if (optimizedCashRegister?.expected_cash_balance !== undefined) {
        return optimizedCashRegister.expected_cash_balance
      }
      
      if (!currentRegister) return 0
      
      const opening = parseFloat(currentRegister.initial_amount) || 0
      
      const cashMovements = movements.filter(movement => {
        const paymentMethod = getPaymentMethod(movement, isCashPaymentMethod)
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
  }, [currentRegister, movements, optimizedCashRegister, selectedBranchIdsArray, multipleCashRegisters, isCashPaymentMethod])

  // Función para calcular ingresos de hoy
  const calculateTodayIncome = useMemo(() => {
    return () => {
      if (!currentRegister || !movements.length) return 0
      
      return movements.reduce((total, movement) => {
        const amount = parseFloat(movement.amount) || 0
        const opRaw = (movement.movement_type as any)?.operation_type
        const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
        return total + (isIncome ? Math.abs(amount) : 0)
      }, 0)
    }
  }, [currentRegister, movements])

  // Función para calcular gastos de hoy
  const calculateTodayExpenses = useMemo(() => {
    return () => {
      if (!currentRegister || !movements.length) return 0
      
      return movements.reduce((total, movement) => {
        const amount = parseFloat(movement.amount) || 0
        const opRaw = (movement.movement_type as any)?.operation_type
        const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
        return total + (!isIncome ? Math.abs(amount) : 0)
      }, 0)
    }
  }, [currentRegister, movements])

  // Función para calcular saldo desde apertura
  const calculateBalanceSinceOpening = useMemo(() => {
    return () => {
      if (!currentRegister || !movements.length) return 0
      
      const opening = parseFloat(currentRegister.initial_amount) || 0
      
      const totalMovements = movements.reduce((total, movement) => {
        const amount = parseFloat(movement.amount) || 0
        const opRaw = (movement.movement_type as any)?.operation_type
        const isIncome = typeof opRaw === 'string' ? opRaw.toLowerCase() === 'entrada' : !!(movement.movement_type as any)?.is_income
        return total + (isIncome ? Math.abs(amount) : -Math.abs(amount))
      }, 0)
      
      return opening + totalMovements
    }
  }, [currentRegister, movements])

  // Funciones de cálculo para múltiples sucursales usando datos del backend
  const calculateMultipleBranchesBalance = useMemo(() => {
    return () => {
      // Si hay múltiples sucursales y tenemos datos consolidados, usarlos
      if (selectedBranchIdsArray.length > 1 && Object.keys(consolidatedStats).length > 0) {
        return consolidatedStats.total_balance || 0
      }
      return calculateCashOnlyBalance()
    }
  }, [selectedBranchIdsArray.length, consolidatedStats, calculateCashOnlyBalance])

  const calculateMultipleBranchesIncome = useMemo(() => {
        return () => {
          if (selectedBranchIdsArray.length > 1 && Object.keys(consolidatedStats).length > 0) {
            return consolidatedStats.total_income || 0
          }
          return calculateTodayIncome()
        }
  }, [selectedBranchIdsArray.length, consolidatedStats, calculateTodayIncome])

  const calculateMultipleBranchesExpenses = useMemo(() => {
    return () => {
      if (selectedBranchIdsArray.length > 1 && Object.keys(consolidatedStats).length > 0) {
        return consolidatedStats.total_expenses || 0
      }
      return calculateTodayExpenses()
    }
  }, [selectedBranchIdsArray.length, consolidatedStats, calculateTodayExpenses])

  const calculateMultipleBranchesSaldo = useMemo(() => {
    return () => {
      if (selectedBranchIdsArray.length > 1 && Object.keys(consolidatedStats).length > 0) {
        return consolidatedStats.total_saldo || 0
      }
      return calculateBalanceSinceOpening()
    }
  }, [selectedBranchIdsArray.length, consolidatedStats, calculateBalanceSinceOpening])

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
