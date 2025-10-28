import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { MovementType, ProcessCreditPurchaseData } from '@/types/currentAccount';
import { CurrentAccountService, MovementTypeService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { usePermissions } from '@/hooks/usePermissions';

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number;
  currentBalance: number;
  creditLimit: number;
  onSuccess: () => void;
}

export function CreditPurchaseDialog({ 
  open, 
  onOpenChange, 
  accountId, 
  currentBalance, 
  creditLimit, 
  onSuccess 
}: CreditPurchaseDialogProps) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    movement_type_id: '',
    reference: ''
  });
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [creditCheck, setCreditCheck] = useState<boolean | null>(null);
  const { hasPermission } = usePermissions();

  const availableCredit = creditLimit - currentBalance;

  useEffect(() => {
    if (open) {
      loadMovementTypes();
      setFormData({
        amount: '',
        description: '',
        movement_type_id: '',
        reference: ''
      });
      setCreditCheck(null);
    }
  }, [open]);

  useEffect(() => {
    if (formData.amount) {
      checkCredit();
    }
  }, [formData.amount]);

  const loadMovementTypes = async () => {
    try {
      setLoadingTypes(true);
      const types = await MovementTypeService.getOutflowTypes();
      setMovementTypes(types);
    } catch (error) {
      console.error('Error loading movement types:', error);
      toast.error('Error al cargar los tipos de movimiento');
    } finally {
      setLoadingTypes(false);
    }
  };

  const checkCredit = async () => {
    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      setCreditCheck(null);
      return;
    }

    try {
      const available = await CurrentAccountService.checkAvailableCredit(accountId, amount);
      setCreditCheck(available);
    } catch (error) {
      console.error('Error checking credit:', error);
      setCreditCheck(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (creditCheck === false) {
      toast.error('No hay crédito disponible para esta compra');
      return;
    }

    try {
      setLoading(true);
      
      const data: ProcessCreditPurchaseData = {
        amount,
        description: formData.description,
        movement_type_id: formData.movement_type_id ? parseInt(formData.movement_type_id) : undefined,
        reference: formData.reference || undefined
      };

      await CurrentAccountService.processCreditPurchase(accountId, data);
      toast.success('Compra a crédito procesada exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing credit purchase:', error);
      toast.error(error.response?.data?.message || 'Error al procesar la compra a crédito');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('procesar_compras_credito')) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Compra a Crédito
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Balance Actual:</span>
              <span className={`font-bold ${currentBalance < 0 ? 'text-red-600' : ''}`}>
                {CurrentAccountUtils.formatCurrency(currentBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Límite de Crédito:</span>
              <span className="font-bold">
                {CurrentAccountUtils.formatCurrency(creditLimit)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Crédito Disponible:</span>
              <span className={`font-bold ${availableCredit < 0 ? 'text-red-600' : ''}`}>
                {CurrentAccountUtils.formatCurrency(availableCredit)}
              </span>
            </div>
          </div>

          {availableCredit <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm text-red-600">
                Esta cuenta ha alcanzado su límite de crédito
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Monto de la Compra *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
            
            {formData.amount && creditCheck !== null && (
              <div className={`text-sm ${creditCheck ? 'text-green-600' : 'text-red-600'}`}>
                {creditCheck ? (
                  '✓ Crédito disponible para esta compra'
                ) : (
                  '✗ No hay crédito suficiente para esta compra'
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Descripción de la compra..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement_type_id">Tipo de Movimiento</Label>
            <Select 
              value={formData.movement_type_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, movement_type_id: value }))}
              disabled={loadingTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {movementTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              placeholder="Número de referencia o comprobante..."
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || creditCheck === false || availableCredit <= 0}
            >
              {loading ? 'Procesando...' : 'Procesar Compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

