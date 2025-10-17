import { useState, useMemo } from "react"

interface UseMultiBranchFiltersProps {
  movements: any[]
  availableBranches: Array<{ id: number; name: string }>
}

export const useMultiBranchFilters = ({ movements, availableBranches }: UseMultiBranchFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [dateRangeFilter, setDateRangeFilter] = useState("all")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })


  // Filtrar movimientos aplicando todos los filtros
  // NOTA: Todos los filtros (búsqueda, tipo, sucursal, fechas) se manejan en el backend
  // El frontend solo muestra los resultados que ya vienen filtrados del backend
  const filteredMovements = useMemo(() => {
    // Los movimientos ya vienen filtrados del backend según todos los criterios
    return movements
  }, [movements])

  // Estadísticas de los movimientos filtrados
  const filteredStats = useMemo(() => {
    const stats = {
      totalMovements: filteredMovements.length,
      totalIncome: 0,
      totalExpenses: 0,
      branchStats: {} as Record<number, {
        name: string
        movements: number
        income: number
        expenses: number
      }>
    }

    filteredMovements.forEach(movement => {
      const amount = parseFloat(movement.amount) || 0
      const isIncome = movement.movement_type?.operation_type === 'entrada' || 
                      movement.movement_type?.is_income === true
      
      if (isIncome) {
        stats.totalIncome += amount
      } else {
        stats.totalExpenses += amount
      }

      // Estadísticas por sucursal
      const branchId = movement.branch_id
      if (!stats.branchStats[branchId]) {
        const branch = availableBranches.find(b => b.id === branchId)
        stats.branchStats[branchId] = {
          name: branch?.name || `Sucursal ${branchId}`,
          movements: 0,
          income: 0,
          expenses: 0
        }
      }

      stats.branchStats[branchId].movements++
      if (isIncome) {
        stats.branchStats[branchId].income += amount
      } else {
        stats.branchStats[branchId].expenses += amount
      }
    })

    return stats
  }, [filteredMovements, availableBranches])

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm("")
    setMovementTypeFilter("all")
    setBranchFilter("all")
    setDateRangeFilter("all")
    setCustomDateRange({ from: undefined, to: undefined })
  }

  // Función para obtener resumen de filtros activos
  const getActiveFiltersSummary = () => {
    const activeFilters = []
    
    if (searchTerm) {
      activeFilters.push(`Búsqueda: "${searchTerm}"`)
    }
    
    if (movementTypeFilter !== "all") {
      activeFilters.push("Tipo de movimiento filtrado")
    }
    
    if (branchFilter !== "all") {
      const branch = availableBranches.find(b => b.id.toString() === branchFilter)
      activeFilters.push(`Sucursal: ${branch?.name || branchFilter}`)
    }
    
    if (dateRangeFilter !== "all") {
      activeFilters.push("Rango de fechas filtrado")
    }
    
    return activeFilters
  }

  return {
    // Estados de filtros
    searchTerm,
    setSearchTerm,
    movementTypeFilter,
    setMovementTypeFilter,
    branchFilter,
    setBranchFilter,
    dateRangeFilter,
    setDateRangeFilter,
    customDateRange,
    setCustomDateRange,
    
    // Datos filtrados
    filteredMovements,
    filteredStats,
    
    // Utilidades
    clearAllFilters,
    getActiveFiltersSummary,
    
    // Estado de filtros
    hasActiveFilters: searchTerm || movementTypeFilter !== "all" || branchFilter !== "all" || dateRangeFilter !== "all" || customDateRange.from
  }
}
