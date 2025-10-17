import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NewMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMovement: (movementForm: { movement_type_id: string; payment_method_id: string; amount: string; description: string }) => void
  loading: boolean
  movementTypes: any[]
  paymentMethods: any[]
}

export const NewMovementDialog = ({
  open,
  onOpenChange,
  onAddMovement,
  loading,
  movementTypes,
  paymentMethods
}: NewMovementDialogProps) => {
  const [movementForm, setMovementForm] = useState({
    movement_type_id: '',
    payment_method_id: '',
    amount: '',
    description: '',
  })
  const [showValidationErrors, setShowValidationErrors] = useState(false)

  const handleClose = () => {
    setMovementForm({ movement_type_id: '', payment_method_id: '', amount: '', description: '' })
    setShowValidationErrors(false)
    onOpenChange(false)
  }

  const filteredMovementTypes = movementTypes.filter((type) => {
    const typeName = type.description?.toLowerCase() || ''
    
    const isAutomaticMovement = 
      typeName.includes('venta') || 
      typeName.includes('compra de mercadería') ||
      typeName.includes('compra de mercaderia') ||
      typeName.includes('pago de cuenta corriente') ||
      typeName.includes('pago cuenta corriente')
    
    return !isAutomaticMovement
  })

  // Validación de campos
  const isFormValid = () => {
    return (
      movementForm.movement_type_id.trim() !== '' &&
      movementForm.payment_method_id.trim() !== '' &&
      movementForm.amount.trim() !== '' &&
      parseFloat(movementForm.amount) > 0 &&
      movementForm.description.trim() !== ''
    )
  }

  const getValidationErrors = () => {
    const errors: string[] = []
    
    if (movementForm.movement_type_id.trim() === '') {
      errors.push('Debe seleccionar un tipo de movimiento')
    }
    
    if (movementForm.payment_method_id.trim() === '') {
      errors.push('Debe seleccionar un método de pago')
    }
    
    if (movementForm.amount.trim() === '') {
      errors.push('Debe ingresar una cantidad')
    } else if (parseFloat(movementForm.amount) <= 0) {
      errors.push('La cantidad debe ser mayor a 0')
    }
    
    if (movementForm.description.trim() === '') {
      errors.push('Debe ingresar una descripción')
    }
    
    return errors
  }

  const handleSubmit = () => {
    if (isFormValid()) {
      onAddMovement(movementForm)
      handleClose()
    } else {
      setShowValidationErrors(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:w-full">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento de Caja</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del movimiento de entrada o salida de dinero.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="movement-type">Tipo de Movimiento</Label>
            <Select
              value={movementForm.movement_type_id}
              onValueChange={(value) => setMovementForm(prev => ({ ...prev, movement_type_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo de movimiento" />
              </SelectTrigger>
              <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                {filteredMovementTypes.map((type) => {
                  const op = String(((type as any)?.operation_type ?? ((type as any)?.is_income ? 'entrada' : 'salida'))).toLowerCase()
                  const label = op === 'entrada' ? '(Entrada)' : '(Salida)'
                  return (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.description} {label}
                    </SelectItem>
                  )
                })}
                {filteredMovementTypes.length === 0 && (
                  <SelectItem value="no-movement-types" disabled>No hay tipos de movimiento disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="payment-method">Método de Pago</Label>
            <Select
              value={movementForm.payment_method_id}
              onValueChange={(value) => setMovementForm(prev => ({ ...prev, payment_method_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un método de pago" />
              </SelectTrigger>
              <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                {paymentMethods.length === 0 && (
                  <SelectItem value="no-payment-methods" disabled>No hay métodos de pago disponibles</SelectItem>
                )}
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id.toString()}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="movement-amount">Cantidad</Label>
            <Input
              id="movement-amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={movementForm.amount}
              onChange={(e) => setMovementForm(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="movement-description">Descripción</Label>
            <Textarea
              id="movement-description"
              placeholder="Descripción del movimiento"
              value={movementForm.description}
              onChange={(e) => setMovementForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>
        
        {/* Mostrar errores de validación */}
        {showValidationErrors && getValidationErrors().length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {getValidationErrors().map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Movimiento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
