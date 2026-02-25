import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { sileo } from "sileo"
import { Minus, Loader2 } from 'lucide-react';
import { MovementType, CreateMovementData } from '@/types/currentAccount';
import { CurrentAccountService, MovementTypeService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { usePermissions } from '@/hooks/usePermissions';
import { filterManualCurrentAccountMovementTypes } from '@/utils/movementTypeUtils';


interface NewMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number;
  currentBalance: number;
  onSuccess: () => void;
}

const INITIAL_FORM_DATA = {
  amount: '',
  description: '',
  movement_type_id: '',
  reference: '',
  operation_type: 'salida' as 'entrada' | 'salida',
};

export function NewMovementDialog({ 
  open, 
  onOpenChange, 
  accountId, 
  currentBalance,
  onSuccess 
}: NewMovementDialogProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const { hasPermission } = usePermissions();

  // Resetear formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setFormData({ ...INITIAL_FORM_DATA });
    }
  }, [open]);

  // Cargar tipos de movimiento (solo débitos)
  const loadMovementTypes = useCallback(async () => {
    try {
      setLoadingTypes(true);
      const allTypes = await MovementTypeService.getOutflowTypes();
      const manualTypes = filterManualCurrentAccountMovementTypes(allTypes);
      setMovementTypes(manualTypes);
    } catch (error) {
      console.error('Error loading movement types:', error);
      sileo.error({ title: 'Error al cargar los tipos de movimiento' });
      setMovementTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMovementTypes();
    }
  }, [open, loadMovementTypes]);

  // Validar formulario antes de enviar
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!formData.movement_type_id || !formData.amount || !formData.description) {
      return { isValid: false, error: 'Por favor completa todos los campos requeridos' };
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, error: 'El monto debe ser mayor a 0' };
    }

    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      sileo.error({ title: validation.error || 'Error de validación' });
      return;
    }

    try {
      setLoading(true);
      
      const movementData: CreateMovementData = {
        current_account_id: accountId,
        movement_type_id: parseInt(formData.movement_type_id),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        reference: formData.reference.trim() || undefined,
      };

      await CurrentAccountService.createMovement(movementData);

      sileo.success({ title: 'Movimiento creado exitosamente' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating movement:', error);
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || 'Error al crear el movimiento';
      sileo.error({ title: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleMovementTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      movement_type_id: value,
    }));
  };


  if (!hasPermission('gestionar_cuentas_corrientes')) {
    return null;
  }

  const hasMovementTypes = movementTypes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Minus className="h-5 w-5 mr-2 text-red-600" />
            Nuevo Movimiento - Débito
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden pl-2 pr-1">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Balance Actual:</span>
                <span className={`font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {CurrentAccountUtils.formatCurrency(currentBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="movement_type_id" className="text-sm">Tipo de Movimiento *</Label>
              <Select 
                value={formData.movement_type_id} 
                onValueChange={handleMovementTypeChange}
                disabled={loadingTypes || !hasMovementTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loadingTypes 
                      ? "Cargando tipos..." 
                      : hasMovementTypes 
                        ? "Selecciona un tipo" 
                        : "No hay tipos disponibles"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {movementTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingTypes && (
                <p className="text-xs text-muted-foreground">Cargando tipos...</p>
              )}
              {!loadingTypes && !hasMovementTypes && (
                <p className="text-xs text-yellow-600">
                  No hay tipos de movimiento disponibles para débito
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Descripción del movimiento..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-sm">Referencia (Opcional)</Label>
              <Input
                id="reference"
                placeholder="Número de referencia, cheque, etc."
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>

            <DialogFooter className="flex-shrink-0 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !hasMovementTypes}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-2" />
                    Crear Movimiento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
