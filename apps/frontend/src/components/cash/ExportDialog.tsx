import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Download, Building2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: 'excel' | 'pdf' | 'csv', type: 'movements' | 'summary' | 'comparison', selectedBranches: number[]) => void
  loading: boolean
  availableBranches: Array<{ id: number; name: string }>
  selectedBranchIds: number[]
}

export const ExportDialog = ({
  open,
  onOpenChange,
  onExport,
  loading,
  availableBranches,
  selectedBranchIds
}: ExportDialogProps) => {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'csv'>('excel')
  const [selectedType, setSelectedType] = useState<'movements' | 'summary' | 'comparison'>('movements')
  const [selectedBranches, setSelectedBranches] = useState<number[]>(selectedBranchIds)

  const handleExport = () => {
    onExport(selectedFormat, selectedType, selectedBranches)
  }

  const handleClose = () => {
    setSelectedBranches(selectedBranchIds) // Reset to original selection
    onOpenChange(false)
  }

  const handleBranchToggle = (branchId: number) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    )
  }

  const handleSelectAll = () => {
    setSelectedBranches(availableBranches.map(branch => branch.id))
  }

  const handleSelectNone = () => {
    setSelectedBranches([])
  }

  const formatOptions = [
    { value: 'excel', label: 'Excel (.xls)', description: 'Formato de hoja de cálculo compatible con Excel' },
    { value: 'pdf', label: 'PDF', description: 'Documento PDF para impresión y visualización' },
    { value: 'csv', label: 'CSV', description: 'Archivo de texto separado por comas' }
  ]

  const typeOptions = [
    { value: 'movements', label: 'Movimientos', description: 'Lista detallada de todos los movimientos' },
    { value: 'summary', label: 'Resumen', description: 'Estadísticas consolidadas de las sucursales' },
    { value: 'comparison', label: 'Comparación', description: 'Análisis comparativo entre sucursales' }
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Datos
          </DialogTitle>
          <DialogDescription>
            Selecciona el formato y tipo de reporte que deseas exportar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="format-select">Formato de Archivo</Label>
            <Select value={selectedFormat} onValueChange={(value: 'excel' | 'pdf' | 'csv') => setSelectedFormat(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un formato" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="type-select">Tipo de Reporte</Label>
            <Select value={selectedType} onValueChange={(value: 'movements' | 'summary' | 'comparison') => setSelectedType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selección de sucursales */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="branches-select" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Sucursales a Incluir
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectNone}
                  className="text-xs"
                >
                  Ninguna
                </Button>
              </div>
            </div>
            
            <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
              {availableBranches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No hay sucursales disponibles
                </p>
              ) : (
                availableBranches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={() => handleBranchToggle(branch.id)}
                    />
                    <Label
                      htmlFor={`branch-${branch.id}`}
                      className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
                    >
                      {branch.color && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: branch.color }}
                        />
                      )}
                      <span>{branch.name}</span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            
            {selectedBranches.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedBranches.length} sucursal{selectedBranches.length !== 1 ? 'es' : ''} seleccionada{selectedBranches.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Información adicional */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Información del Reporte</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• El archivo incluirá los filtros actualmente aplicados</p>
              <p>• Se mostrará información de fechas y sucursales seleccionadas</p>
              <p>• Los datos se ordenarán por fecha (más recientes primero)</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={loading || selectedBranches.length === 0}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
