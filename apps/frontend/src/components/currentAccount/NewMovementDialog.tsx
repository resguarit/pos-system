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
import { toast } from 'sonner';
import { Plus, Minus, Loader2, Info } from 'lucide-react';
import { MovementType, CreateMovementData } from '@/types/currentAccount';
import { CurrentAccountService, MovementTypeService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { usePermissions } from '@/hooks/usePermissions';
import { filterManualMovementTypes, getOperationTypeInfo } from '@/utils/movementTypeUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface PaymentMethod {
  id: number;
  name: string;
  is_active: boolean;
}

interface CashRegister {
  id: number;
  branch_id: number;
  user_id: number;
  status: string;
  branch?: {
    id: number;
    description: string;
  };
  user?: {
    id: number;
    username: string;
  };
}

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
  operation_type: 'entrada' as 'entrada' | 'salida',
  branch_id: '',
  cash_register_id: '',
  payment_method_id: '',
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingCashData, setLoadingCashData] = useState(false);
  const { hasPermission } = usePermissions();
  const { request } = useApi();
  const { branches, currentBranch } = useAuth();

  // Cargar métodos de pago (solo una vez), excluyendo "Cuenta Corriente" para depósitos
  const loadPaymentMethods = useCallback(async () => {
    try {
      const paymentResponse = await api.get('/payment-methods');
      const paymentData = paymentResponse.data?.data || paymentResponse.data || [];
      // Filtrar métodos activos y excluir "Cuenta Corriente" y variantes específicas
      const filteredMethods = paymentData.filter((m: PaymentMethod) => {
        if (!m.is_active) return false;
        const nameLower = m.name.toLowerCase().trim();
        // Excluir métodos que sean específicamente "Cuenta Corriente" o variantes
        return !nameLower.includes('cuenta corriente') && 
               !nameLower.includes('cta cte') &&
               !nameLower.includes('cta. cte') &&
               nameLower !== 'corriente'; // Solo excluir si es exactamente "corriente"
      });
      setPaymentMethods(filteredMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    }
  }, []);

  // Cargar y seleccionar automáticamente la caja de una sucursal específica
  const loadCashRegisters = useCallback(async (branchId: number) => {
    try {
      setLoadingCashData(true);
      const cashResponse = await request({
        method: 'GET',
        url: `/cash-registers/current?branch_id=${branchId}`
      });
      const cashData = cashResponse.data?.data || cashResponse.data;
      if (cashData && cashData.id) {
        setCashRegisters([cashData]);
        // Si la caja está abierta, seleccionarla automáticamente
        if (cashData.status === 'open') {
          setFormData(prev => ({ 
            ...prev, 
            cash_register_id: cashData.id.toString() 
          }));
        } else {
          // Si está cerrada, limpiar la selección
          setFormData(prev => ({ 
            ...prev, 
            cash_register_id: '' 
          }));
        }
      } else {
        setCashRegisters([]);
        setFormData(prev => ({ 
          ...prev, 
          cash_register_id: '' 
        }));
      }
    } catch (error) {
      console.error('Error loading cash register:', error);
      setCashRegisters([]);
      setFormData(prev => ({ 
        ...prev, 
        cash_register_id: '' 
      }));
      toast.error('Error al cargar caja de la sucursal');
    } finally {
      setLoadingCashData(false);
    }
  }, [request]);

  // Resetear formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      const initialData = { ...INITIAL_FORM_DATA };
      // Pre-seleccionar sucursal actual si existe
      if (currentBranch?.id) {
        initialData.branch_id = currentBranch.id;
      }
      setFormData(initialData);
      loadPaymentMethods();
      
      // Si hay sucursal pre-seleccionada, cargar y seleccionar automáticamente la caja
      if (initialData.branch_id) {
        loadCashRegisters(parseInt(initialData.branch_id));
      }
    }
  }, [open, currentBranch, loadPaymentMethods, loadCashRegisters]);

  // Cargar tipos de movimiento cuando cambia el tipo de operación o se abre el diálogo
  const loadMovementTypes = useCallback(async (operationType: 'entrada' | 'salida') => {
    try {
      setLoadingTypes(true);
      const allTypes = operationType === 'entrada'
        ? await MovementTypeService.getInflowTypes()
        : await MovementTypeService.getOutflowTypes();
      
      const manualTypes = filterManualMovementTypes(allTypes);
      setMovementTypes(manualTypes);
    } catch (error) {
      console.error('Error loading movement types:', error);
      toast.error('Error al cargar los tipos de movimiento');
      setMovementTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    if (open && formData.operation_type) {
      loadMovementTypes(formData.operation_type);
    }
  }, [open, formData.operation_type, loadMovementTypes]);

  // Validar formulario antes de enviar
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!formData.movement_type_id || !formData.amount || !formData.description) {
      return { isValid: false, error: 'Por favor completa todos los campos requeridos' };
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, error: 'El monto debe ser mayor a 0' };
    }

    // Si es depósito a cuenta, validar que haya sucursal, caja y método de pago
    const selectedMovementType = movementTypes.find(
      type => type.id.toString() === formData.movement_type_id
    );
    const isDepositMovement = selectedMovementType?.name.toLowerCase() === 'depósito a cuenta';
    
    if (isDepositMovement) {
      if (!formData.branch_id) {
        return { isValid: false, error: 'Debes seleccionar una sucursal para el depósito' };
      }
      
      // Verificar estado de la caja
      const cashRegister = cashRegisters[0];
      if (!cashRegister) {
        return { isValid: false, error: 'No hay caja disponible en esta sucursal' };
      }
      if (cashRegister.status !== 'open') {
        return { isValid: false, error: 'La caja de esta sucursal está cerrada. Debes abrirla antes de registrar un depósito' };
      }
      
      // Si la caja está abierta, asegurarse de que esté seleccionada
      if (cashRegister.status === 'open') {
        // No validar si está seleccionada, solo verificar que existe y está abierta
        // El handleSubmit usará directamente la caja disponible
      }
      
      if (!formData.payment_method_id) {
        return { isValid: false, error: 'Debes seleccionar un método de pago para el depósito' };
      }
    }

    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      toast.error(validation.error || 'Error de validación');
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

      // Si es depósito a cuenta, agregar datos de caja
      const selectedMovementType = movementTypes.find(
        type => type.id.toString() === formData.movement_type_id
      );
      const isDepositMovement = selectedMovementType?.name.toLowerCase() === 'depósito a cuenta';
      
      if (isDepositMovement) {
        // Usar la caja disponible directamente si está abierta
        const cashRegister = cashRegisters[0];
        if (cashRegister && cashRegister.status === 'open' && formData.payment_method_id) {
          movementData.cash_register_id = cashRegister.id;
          movementData.payment_method_id = parseInt(formData.payment_method_id);
        } else {
          // Si no hay caja o no está abierta, esto ya debería haberse validado antes
          // pero por seguridad, usar los valores del formulario si existen
          if (formData.cash_register_id && formData.payment_method_id) {
            movementData.cash_register_id = parseInt(formData.cash_register_id);
            movementData.payment_method_id = parseInt(formData.payment_method_id);
          } else {
            throw new Error('No se puede crear el depósito sin caja abierta o método de pago');
          }
        }
      }

      await CurrentAccountService.createMovement(movementData);

      toast.success('Movimiento creado exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating movement:', error);
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || 'Error al crear el movimiento';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOperationTypeChange = (value: 'entrada' | 'salida') => {
    setFormData(prev => ({ 
      ...prev, 
      operation_type: value, 
      movement_type_id: '', // Resetear tipo de movimiento al cambiar operación
      branch_id: currentBranch?.id || '', // Mantener sucursal actual o resetear
      cash_register_id: '', // Resetear caja
      payment_method_id: '', // Resetear método de pago
    }));
    loadMovementTypes(value);
  };

  const handleMovementTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      movement_type_id: value,
      // Resetear caja y método de pago si no es depósito
      cash_register_id: '',
      payment_method_id: '',
    }));
  };

  const handleBranchChange = (value: string) => {
    const branchId = parseInt(value);
    setFormData(prev => ({ 
      ...prev, 
      branch_id: value,
      cash_register_id: '', // Se seleccionará automáticamente al cargar
    }));
    
    // Cargar y seleccionar automáticamente la caja de la nueva sucursal
    if (branchId) {
      loadCashRegisters(branchId);
    } else {
      setCashRegisters([]);
      setFormData(prev => ({ 
        ...prev, 
        cash_register_id: '' 
      }));
    }
  };

  if (!hasPermission('gestionar_cuentas_corrientes')) {
    return null;
  }

  const operationInfo = getOperationTypeInfo(formData.operation_type);
  const hasMovementTypes = movementTypes.length > 0;
  
  // Verificar si el tipo de movimiento seleccionado es "Depósito a cuenta"
  const selectedMovementType = movementTypes.find(
    type => type.id.toString() === formData.movement_type_id
  );
  const isDepositMovement = selectedMovementType?.name.toLowerCase() === 'depósito a cuenta';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            {operationInfo.isCredit ? (
              <Plus className="h-5 w-5 mr-2 text-green-600" />
            ) : (
              <Minus className="h-5 w-5 mr-2 text-red-600" />
            )}
            Nuevo Movimiento - {operationInfo.title}
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
              <Label htmlFor="operation_type" className="text-sm">Tipo de Operación *</Label>
              <Select 
                value={formData.operation_type} 
                onValueChange={handleOperationTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2 text-green-600" />
                      Crédito (Reduce deuda)
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center">
                      <Minus className="h-4 w-4 mr-2 text-red-600" />
                      Débito (Aumenta deuda)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{operationInfo.description}</p>
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
                  No hay tipos de movimiento disponibles para {operationInfo.isCredit ? 'crédito' : 'débito'}
                </p>
              )}
              {isDepositMovement && (
                <Alert className="mt-2 border-blue-200 bg-blue-50 py-2">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-800">
                    Este movimiento también creará un movimiento de caja. Completa los campos de caja y método de pago.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {isDepositMovement && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="branch_id" className="text-sm">Sucursal *</Label>
                  <Select 
                    value={formData.branch_id} 
                    onValueChange={handleBranchChange}
                    disabled={!branches || branches.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        branches && branches.length > 0
                          ? "Selecciona una sucursal"
                          : "No hay sucursales disponibles"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {branches && branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.description || branch.name || `Sucursal ${branch.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {branches && branches.length === 0 && (
                    <p className="text-xs text-red-600">
                      No tienes acceso a ninguna sucursal
                    </p>
                  )}
                </div>

                {formData.branch_id && (
                  <>
                    {loadingCashData ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Caja</Label>
                        <p className="text-xs text-muted-foreground">Cargando información de la caja...</p>
                      </div>
                    ) : cashRegisters.length > 0 && cashRegisters[0] ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Caja</Label>
                        <div className="p-3 rounded-lg border bg-muted">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {cashRegisters[0].user?.username || `Usuario ${cashRegisters[0].user_id}`}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              cashRegisters[0].status === 'open' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {cashRegisters[0].status === 'open' ? 'Abierta' : 'Cerrada'}
                            </span>
                          </div>
                        </div>
                        {cashRegisters[0].status !== 'open' && (
                          <p className="text-xs text-red-600">
                            La caja está cerrada. Debes abrirla antes de registrar un depósito.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Caja</Label>
                        <p className="text-xs text-red-600">
                          No hay caja disponible en esta sucursal.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="payment_method_id" className="text-sm">Método de Pago *</Label>
                      <Select 
                        value={formData.payment_method_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method_id: value }))}
                        disabled={paymentMethods.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            paymentMethods.length === 0
                              ? "No hay métodos disponibles"
                              : "Selecciona un método de pago"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id.toString()}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {paymentMethods.length === 0 && (
                        <p className="text-xs text-yellow-600">
                          No hay métodos de pago disponibles
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

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
                    {operationInfo.isCredit ? (
                      <Plus className="h-4 w-4 mr-2" />
                    ) : (
                      <Minus className="h-4 w-4 mr-2" />
                    )}
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
