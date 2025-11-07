import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { 
  PendingSale, 
  SalePayment,
  ProcessPaymentBySaleData
} from '@/types/currentAccount';
import { CurrentAccountService } from '@/lib/services/currentAccountService';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number;
  currentBalance: number | null | undefined;
  onSuccess: () => void;
}

interface PaymentMethod {
  id: number;
  name: string;
}

interface SalePaymentForm {
  [saleId: number]: {
    selected: boolean;
    amount: string;
  };
}


export function PaymentDialog({ open, onOpenChange, accountId, currentBalance, onSuccess }: PaymentDialogProps) {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salePayments, setSalePayments] = useState<SalePaymentForm>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const { hasPermission } = usePermissions();
  const { branches, currentBranch } = useAuth();

  const loadPaymentMethods = useCallback(async () => {
    try {
      setLoadingMethods(true);
      const response = await api.get('/payment-methods');
      const allMethods = response.data.data || response.data;
      
      // Filtrar métodos activos y excluir "Cuenta Corriente" y "Crédito a favor"
      const filteredMethods = allMethods.filter((method: PaymentMethod) => {
        // Solo métodos activos
        if (!method.is_active) return false;
        
        const nameLower = method.name.toLowerCase().trim();
        // Excluir "Cuenta Corriente"
        if (nameLower.includes('cuenta corriente') || 
            nameLower.includes('cta cte') ||
            nameLower.includes('cta. cte') ||
            nameLower === 'corriente') {
          return false;
        }
        // Excluir "Crédito a favor"
        if (nameLower.includes('crédito a favor') || 
            nameLower.includes('credito a favor')) {
          return false;
        }
        return true;
      });
      
      setPaymentMethods(filteredMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoadingMethods(false);
    }
  }, []);

  const loadPendingSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      const sales = await CurrentAccountService.getPendingSales(accountId);
      setPendingSales(sales);
      
      // Inicializar formulario
      const initialForm: SalePaymentForm = {};
      sales.forEach(sale => {
        initialForm[sale.id] = {
          selected: false,
          amount: sale.pending_amount.toFixed(2)
        };
      });
      setSalePayments(initialForm);
    } catch (error) {
      console.error('Error loading pending sales:', error);
      toast.error('Error al cargar ventas pendientes');
    } finally {
      setLoadingSales(false);
    }
  }, [accountId]);


  // Detectar si todas las ventas seleccionadas son de la misma sucursal
  const getSelectedSalesBranchIds = useCallback((): number[] => {
    const selectedSaleIds = Object.entries(salePayments)
      .filter(([_, payment]) => payment.selected)
      .map(([saleId]) => parseInt(saleId));
    
    const branchIds = selectedSaleIds
      .map(saleId => {
        const sale = pendingSales.find(s => s.id === saleId);
        return sale?.branch_id;
      })
      .filter((branchId): branchId is number => branchId !== undefined);
    
    return [...new Set(branchIds)]; // Eliminar duplicados
  }, [salePayments, pendingSales]);

  // Obtener la sucursal de las ventas seleccionadas (si todas son de la misma)
  const getSelectedBranchId = useCallback((): number | null => {
    const branchIds = getSelectedSalesBranchIds();
    return branchIds.length === 1 ? branchIds[0] : null;
  }, [getSelectedSalesBranchIds]);

  // Verificar si una venta puede ser seleccionada (misma sucursal que las ya seleccionadas)
  const canSelectSale = useCallback((saleId: number): boolean => {
    const sale = pendingSales.find(s => s.id === saleId);
    if (!sale) return false;
    
    const selectedBranchId = getSelectedBranchId();
    if (!selectedBranchId) return true; // Si no hay ventas seleccionadas, se puede seleccionar
    
    return sale.branch_id === selectedBranchId;
  }, [pendingSales, getSelectedBranchId]);

  useEffect(() => {
    if (open) {
      loadPendingSales();
      loadPaymentMethods();
      setSalePayments({});
      setSelectedPaymentMethod('');
      setSelectedBranchId('');
    }
  }, [open, accountId, loadPendingSales, loadPaymentMethods]);

  // Actualizar sucursal cuando cambian las ventas seleccionadas
  useEffect(() => {
    const selectedBranchId = getSelectedBranchId();
    
    // Si hay una sucursal única de las ventas seleccionadas, usarla automáticamente
    if (selectedBranchId !== null) {
      setSelectedBranchId(selectedBranchId.toString());
    } else {
      // Si no hay ventas seleccionadas o hay un problema, limpiar la selección
      setSelectedBranchId('');
    }
  }, [salePayments, getSelectedBranchId]);

  const handleSaleSelection = (saleId: number, selected: boolean) => {
    const sale = pendingSales.find(s => s.id === saleId);
    if (!sale) return;

    // Si está seleccionando una venta, verificar que sea de la misma sucursal que las ya seleccionadas
    if (selected) {
      const currentlySelectedSales = Object.entries(salePayments)
        .filter(([_, payment]) => payment.selected)
        .map(([id]) => parseInt(id));
      
      if (currentlySelectedSales.length > 0) {
        // Verificar que todas las ventas seleccionadas sean de la misma sucursal
        const selectedBranchIds = currentlySelectedSales
          .map(id => {
            const s = pendingSales.find(p => p.id === id);
            return s?.branch_id;
          })
          .filter((id): id is number => id !== undefined);
        
        const uniqueBranchIds = [...new Set(selectedBranchIds)];
        
        // Si hay ventas seleccionadas y la nueva venta es de otra sucursal, no permitir
        if (uniqueBranchIds.length > 0 && !uniqueBranchIds.includes(sale.branch_id)) {
          const branchName = branches.find(b => b.id === sale.branch_id.toString())?.description || 'otra sucursal';
          const currentBranchName = branches.find(b => b.id === uniqueBranchIds[0].toString())?.description || 'la sucursal seleccionada';
          toast.error(`No puedes seleccionar ventas de distintas sucursales. Esta venta es de ${branchName}, pero ya tienes seleccionadas ventas de ${currentBranchName}.`);
          return;
        }
      }
    }

    setSalePayments(prev => ({
      ...prev,
      [saleId]: {
        ...prev[saleId],
        selected
      }
    }));
  };

  const handleAmountChange = (saleId: number, amount: string) => {
    // Validar que el monto no exceda el pendiente de la venta
    const sale = pendingSales.find(s => s.id === saleId);
    if (sale) {
      const numAmount = parseFloat(amount) || 0;
      const maxAmount = sale.pending_amount;
      
      if (numAmount > maxAmount) {
        toast.warning(`El monto no puede exceder el pendiente de $${maxAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
        setSalePayments(prev => ({
          ...prev,
          [saleId]: {
            ...prev[saleId],
            amount: maxAmount.toFixed(2)
          }
        }));
        return;
      }
    }
    
    setSalePayments(prev => ({
      ...prev,
      [saleId]: {
        ...prev[saleId],
        amount
      }
    }));
  };


  /**
   * Calcular el total a pagar de ventas seleccionadas
   */
  const calculateTotal = (): number => {
    return Object.entries(salePayments).reduce((sum, [saleId, payment]) => {
      if (payment.selected) {
        const sale = pendingSales.find(s => s.id === parseInt(saleId));
        const amount = parseFloat(payment.amount) || 0;
        const maxAmount = sale ? sale.pending_amount : amount;
        const validAmount = Math.min(amount, maxAmount);
        return sum + validAmount;
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
      toast.error('Selecciona un método de pago');
      return;
    }

    // Recolectar ventas seleccionadas
    const selectedSales: SalePayment[] = [];
    Object.entries(salePayments).forEach(([saleId, payment]) => {
      if (payment.selected) {
        const amount = parseFloat(payment.amount);
        if (amount > 0) {
          selectedSales.push({
            sale_id: parseInt(saleId),
            amount
          });
        }
      }
    });

    // Validar que haya al menos una venta seleccionada
    if (selectedSales.length === 0) {
      toast.error('Selecciona al menos una venta para pagar');
      return;
    }

    // Validar montos de las ventas seleccionadas
    for (const salePayment of selectedSales) {
      const sale = pendingSales.find(s => s.id === salePayment.sale_id);
      if (!sale) {
        toast.error(`Venta #${salePayment.sale_id} no encontrada`);
        return;
      }
      
      if (salePayment.amount <= 0) {
        toast.error(`El monto debe ser mayor a 0 para la venta #${sale.receipt_number}`);
        return;
      }
      
      if (salePayment.amount > sale.pending_amount) {
        toast.error(`El pago de $${salePayment.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} excede el monto pendiente de $${sale.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} para la venta #${sale.receipt_number}`);
        return;
      }
    }

    // Obtener la sucursal de las ventas seleccionadas (debe ser única)
    const selectedBranchIdFromSales = getSelectedBranchId();
    
    if (!selectedBranchIdFromSales) {
      toast.error('Error: No se pudo determinar la sucursal de las ventas seleccionadas');
      return;
    }
    
    const branchIdToUse = selectedBranchIdFromSales.toString();

    // Procesar pago
    try {
      setLoading(true);
      
      const paymentData: ProcessPaymentBySaleData = {
        payment_method_id: parseInt(selectedPaymentMethod),
        sale_payments: selectedSales,
        ...(branchIdToUse ? { branch_id: parseInt(branchIdToUse) } : {})
      };
      
      await CurrentAccountService.processPaymentBySale(accountId, paymentData);

      toast.success('Pago procesado exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const message = error?.response?.data?.message || error?.message || 'Error al procesar el pago';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('gestionar_cuentas_corrientes')) {
    return null;
  }

  const totalAmount = calculateTotal();
  const totalPendingDebt = pendingSales.reduce((sum, s) => sum + (s.pending_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de Deudas Pendientes:</span>
              <span className="font-bold text-lg text-red-600">
                ${totalPendingDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {loadingSales ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay deudas pendientes de pago
            </div>
          ) : (
            <>
              {/* Sección de Ventas Pendientes */}
              {pendingSales.length > 0 && (
                <div className="space-y-2">
                  <Label>Ventas Pendientes</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Venta #</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                        <TableHead className="text-right">Monto a Pagar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSales.map(sale => {
                        const isSelected = salePayments[sale.id]?.selected || false;
                        const canSelect = canSelectSale(sale.id);
                        const isDisabled = !isSelected && !canSelect;
                        
                        return (
                          <TableRow key={sale.id} className={isDisabled ? 'opacity-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => 
                                  handleSaleSelection(sale.id, checked as boolean)
                                }
                              />
                            </TableCell>
                          <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                          <TableCell>{new Date(sale.date).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell className="text-right">
                            ${sale.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${sale.paid_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            ${sale.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={sale.pending_amount}
                                value={salePayments[sale.id]?.amount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const numValue = parseFloat(value) || 0;
                                  // Validar en tiempo real que no exceda el pendiente
                                  if (value && numValue > sale.pending_amount) {
                                    // Limitar automáticamente al máximo permitido
                                    handleAmountChange(sale.id, sale.pending_amount.toFixed(2));
                                    toast.warning(`El monto máximo para esta venta es $${sale.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
                                  } else {
                                    handleAmountChange(sale.id, value);
                                  }
                                }}
                                onBlur={(e) => {
                                  // Asegurar que el valor final no exceda el pendiente
                                  const numValue = parseFloat(e.target.value) || 0;
                                  if (numValue > sale.pending_amount) {
                                    handleAmountChange(sale.id, sale.pending_amount.toFixed(2));
                                  } else if (numValue < 0) {
                                    handleAmountChange(sale.id, '0.00');
                                  }
                                }}
                                disabled={!salePayments[sale.id]?.selected}
                                className="pl-10"
                                placeholder="0.00"
                              />
                            </div>
                            {salePayments[sale.id]?.selected && parseFloat(salePayments[sale.id]?.amount || '0') > sale.pending_amount && (
                              <p className="text-xs text-red-600 mt-1">
                                Máximo permitido: ${sale.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </div>
              )}

              {/* Mostrar información de la sucursal cuando hay ventas seleccionadas */}
              {(() => {
                const selectedBranchIdFromSales = getSelectedBranchId();
                
                if (!selectedBranchIdFromSales) return null;
                
                const branch = branches.find(b => b.id === selectedBranchIdFromSales.toString());
                if (!branch) return null;
                
                return (
                  <div className="space-y-2 mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      Sucursal: <span className="text-primary">{branch.description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Todas las ventas seleccionadas son de esta sucursal. El movimiento de caja se registrará aquí.
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago *</Label>
                
                <Select 
                  value={selectedPaymentMethod} 
                  onValueChange={setSelectedPaymentMethod}
                  disabled={loadingMethods}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Total a Pagar:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}

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
              disabled={(() => {
                if (loading || loadingSales) return true;
                
                // Validar que haya al menos una venta seleccionada
                const hasSelectedSales = Object.values(salePayments).some(p => p.selected);
                
                if (!hasSelectedSales) return true;
                
                // Validar que haya un método de pago y un total a pagar
                if (!selectedPaymentMethod) return true;
                
                // Si hay múltiples sucursales, validar que haya sucursal seleccionada
                if (branches.length > 1 && !selectedBranchId) {
                  return true;
                }
                
                return totalAmount === 0;
              })()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Procesar Pago'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
