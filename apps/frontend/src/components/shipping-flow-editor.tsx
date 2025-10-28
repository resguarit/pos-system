import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ShippingStage = {
  id: string
  name: string
  color: string
  completed: boolean
}

interface ShippingFlowEditorProps {
  stage: ShippingStage | null
  onSave: (name: string, color: string) => void
  onCancel: () => void
}

const PRESET_COLORS = [
  { name: "Rojo", value: "#EF4444" },
  { name: "Naranja", value: "#F59E0B" },
  { name: "Amarillo", value: "#EAB308" },
  { name: "Verde", value: "#10B981" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Índigo", value: "#6366F1" },
  { name: "Púrpura", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Gris", value: "#6B7280" },
]

export const ShippingFlowEditor = ({ stage, onSave, onCancel }: ShippingFlowEditorProps) => {
  const [name, setName] = useState(stage?.name || "")
  const [color, setColor] = useState(stage?.color || "#3B82F6")

  useEffect(() => {
    if (stage) {
      setName(stage.name)
      setColor(stage.color)
    }
  }, [stage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      return
    }

    onSave(name, color)
    setName("")
    setColor("#3B82F6")
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? "Editar Etapa" : "Nueva Etapa"}</DialogTitle>
          <DialogDescription>
            {stage ? "Modifica los datos de la etapa" : "Agrega una nueva etapa al flujo de envío"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nombre de la Etapa</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pendiente, En Ruta, Entregado"
              required
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Color de la Etapa</Label>
            
            {/* Color Preview */}
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-lg border-2 border-border shadow-sm"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1 font-mono">{color}</p>
              </div>
            </div>

            {/* Preset Colors */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Colores Predefinidos</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`w-full h-10 rounded-md transition-all hover:scale-110 ${
                      color === preset.value ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: preset.value }}
                    aria-label={`Seleccionar color ${preset.name}`}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 border border-border rounded-lg bg-muted/20">
            <Label className="text-xs text-muted-foreground mb-3 block">Vista Previa</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${color}20`,
                  border: `2px solid ${color}`,
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <p className="font-medium text-foreground">{name || "Nombre de la etapa"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!name.trim()}
            >
              {stage ? "Guardar Cambios" : "Crear Etapa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
