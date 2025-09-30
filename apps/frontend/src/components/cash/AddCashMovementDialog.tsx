import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import type { MovementType, AddMovementData } from '@/types/cash.types'

interface AddCashMovementDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddMovement: (data: AddMovementData) => Promise<boolean>
  movementTypes: MovementType[]
  isProcessing: boolean
}

const AddCashMovementDialog = React.memo(function AddCashMovementDialog({
  isOpen,
  onClose,
  onAddMovement,
  movementTypes,
  isProcessing
}: AddCashMovementDialogProps) {
  const [formData, setFormData] = useState<AddMovementData>({
    amount: 0,
    type: 'income',
    description: '',
    movement_type_id: 0
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida'
    }

    if (!formData.movement_type_id) {
      newErrors.movement_type_id = 'Debe seleccionar un tipo de movimiento'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const success = await onAddMovement(formData)
    if (success) {
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      amount: 0,
      type: 'income',
      description: '',
      movement_type_id: 0
    })
    setErrors({})
    onClose()
  }

  const handleTypeChange = (type: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type }))
    // Limpiar tipo de movimiento cuando cambie el tipo
    setFormData(prev => ({ ...prev, movement_type_id: 0 }))
  }

  const filteredMovementTypes = movementTypes.filter(type => type.type === formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <PlusCircle className="h-5 w-5 mr-2" />
            Agregar Movimiento de Caja
          </DialogTitle>
          <DialogDescription>
            Registra un nuevo ingreso o egreso de efectivo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de movimiento */}
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={formData.type === 'income' ? 'default' : 'outline'}
                onClick={() => handleTypeChange('income')}
                className="flex-1"
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={formData.type === 'expense' ? 'default' : 'outline'}
                onClick={() => handleTypeChange('expense')}
                className="flex-1"
              >
                Egreso
              </Button>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.amount}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Tipo de movimiento específico */}
          <div className="space-y-2">
            <Label htmlFor="movement_type">Tipo de Movimiento</Label>
            <Select
              value={formData.movement_type_id.toString()}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                movement_type_id: parseInt(value) 
              }))}
            >
              <SelectTrigger className={errors.movement_type_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                {filteredMovementTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.movement_type_id && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.movement_type_id}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              placeholder="Descripción del movimiento..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.description}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Resumen:</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className="font-medium">
                  {formData.type === 'income' ? 'Ingreso' : 'Egreso'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monto:</span>
                <span className="font-medium">
                  ${formData.amount.toFixed(2)}
                </span>
              </div>
              {formData.movement_type_id > 0 && (
                <div className="flex justify-between">
                  <span>Categoría:</span>
                  <span className="font-medium">
                    {movementTypes.find(t => t.id === formData.movement_type_id)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                'Agregar Movimiento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})

export default AddCashMovementDialog


