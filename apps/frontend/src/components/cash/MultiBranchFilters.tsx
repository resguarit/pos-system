import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Filter, Calendar } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MultiBranchFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  movementTypeFilter: string
  onMovementTypeChange: (type: string) => void
  branchFilter: string
  onBranchFilterChange: (branch: string) => void
  dateRangeFilter: string
  onDateRangeChange: (range: string) => void
  customDateRange?: { from: Date | undefined; to: Date | undefined }
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
  movementTypes: any[]
  availableBranches: Array<{ id: number; name: string }>
  onClearFilters: () => void
}

export const MultiBranchFilters = ({
  searchTerm,
  onSearchChange,
  movementTypeFilter,
  onMovementTypeChange,
  branchFilter,
  onBranchFilterChange,
  dateRangeFilter,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  movementTypes,
  availableBranches,
  onClearFilters
}: MultiBranchFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const hasActiveFilters = searchTerm || movementTypeFilter !== "all" || branchFilter !== "all" || dateRangeFilter !== "all" || (dateRangeFilter === "custom" && customDateRange?.from)

  const dateRangeOptions = [
    { value: "all", label: "Todas las fechas" },
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "week", label: "Esta semana" },
    { value: "month", label: "Este mes" },
    { value: "custom", label: "Rango personalizado" }
  ]

  return (
    <div className="space-y-4">
      {/* Filtros básicos */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar movimientos..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <Select value={movementTypeFilter} onValueChange={onMovementTypeChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {movementTypes.map((type) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-2 shrink-0"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Filtros avanzados */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sucursal</label>
            <Select value={branchFilter} onValueChange={onBranchFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {availableBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    <div className="flex items-center gap-2">
                      {branch.color && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: branch.color }}
                        />
                      )}
                      <span>{branch.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rango de fechas</label>
            <div className="space-y-2">
              <Select value={dateRangeFilter} onValueChange={onDateRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {dateRangeFilter === "custom" && onCustomDateRangeChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                            {format(customDateRange.to, "dd/MM/yyyy", { locale: es })}
                          </>
                        ) : (
                          format(customDateRange.from, "dd/MM/yyyy", { locale: es })
                        )
                      ) : (
                        <span>Seleccionar fechas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={(range) => {
                        if (onCustomDateRangeChange) {
                          onCustomDateRangeChange({
                            from: range?.from,
                            to: range?.to
                          })
                        }
                      }}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full"
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Búsqueda: "{searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          {movementTypeFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tipo: {movementTypes.find(t => t.id.toString() === movementTypeFilter)?.description}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onMovementTypeChange('all')}
              />
            </Badge>
          )}
          {branchFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sucursal: {availableBranches.find(b => b.id.toString() === branchFilter)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onBranchFilterChange('all')}
              />
            </Badge>
          )}
          {dateRangeFilter !== "all" && dateRangeFilter !== "custom" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Fecha: {dateRangeOptions.find(d => d.value === dateRangeFilter)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onDateRangeChange('all')}
              />
            </Badge>
          )}
          {dateRangeFilter === "custom" && customDateRange?.from && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Fecha: {format(customDateRange.from, "dd/MM/yyyy", { locale: es })}
              {customDateRange.to && customDateRange.to.getTime() !== customDateRange.from.getTime() && (
                <> - {format(customDateRange.to, "dd/MM/yyyy", { locale: es })}</>
              )}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  onDateRangeChange('all')
                  if (onCustomDateRangeChange) {
                    onCustomDateRangeChange({ from: undefined, to: undefined })
                  }
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
