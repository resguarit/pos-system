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
import { DollarSign, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { 
  PendingSale, 
  SalePayment, 
  AdministrativeCharge, 
  ChargePayment,
  ProcessPaymentWithChargesData 
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

interface ChargePaymentForm {
  [chargeId: number]: {
    selected: boolean;
    amount: string;
  };
}

export function PaymentDialog({ open, onOpenChange, accountId, currentBalance, onSuccess }: PaymentDialogProps) {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [administrativeCharges, setAdministrativeCharges] = useState<AdministrativeCharge[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salePayments, setSalePayments] = useState<SalePaymentForm>({});
  const [chargePayments, setChargePayments] = useState<ChargePaymentForm>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [availableFavorCredit, setAvailableFavorCredit] = useState<number>(0);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [favorCreditAmount, setFavorCreditAmount] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const { hasPermission } = usePermissions();
  const { branches, currentBranch } = useAuth();

  const loadPaymentMethods = useCallback(async (creditValue?: number) => {
    try {
      setLoadingMethods(true);
      const response = await api.get('/payment-methods');
      const allMethods = response.data.data || response.data;
      
      // Usar el valor pasado como parámetro o el estado actual
      const currentCredit = creditValue !== undefined ? creditValue : availableFavorCredit;
      
      // Filtrar "Cuenta Corriente" porque estamos pagando una deuda existente,
      // no creando una nueva venta a crédito
      let filteredMethods = allMethods.filter((method: PaymentMethod) => {
        const nameLower = method.name.toLowerCase().trim();
        return !nameLower.includes('cuenta corriente') && 
               !nameLower.includes('cta cte') &&
               !nameLower.includes('cta. cte') &&
               nameLower !== 'corriente';
      });
      
      // Filtrar "Crédito a favor" si no hay crédito disponible
      if (currentCredit <= 0) {
        filteredMethods = filteredMethods.filter((method: PaymentMethod) => {
          const nameLower = method.name.toLowerCase().trim();
          return !nameLower.includes('crédito a favor') && 
                 !nameLower.includes('credito a favor');
        });
      }
      
      setPaymentMethods(filteredMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoadingMethods(false);
    }
  }, [availableFavorCredit]);

  const loadAvailableFavorCredit = useCallback(async () => {
    try {
      setLoadingCredit(true);
      const credit = await CurrentAccountService.getAvailableFavorCredit(accountId);
      const creditValue = credit || 0;
      setAvailableFavorCredit(creditValue);
      // Cargar métodos de pago después de obtener el crédito disponible
      // Pasar el valor directamente para evitar problemas de timing
      await loadPaymentMethods(creditValue);
    } catch (error) {
      console.error('Error loading available favor credit:', error);
      setAvailableFavorCredit(0);
      // Cargar métodos de pago incluso si hay error
      await loadPaymentMethods(0);
    } finally {
      setLoadingCredit(false);
    }
  }, [accountId, loadPaymentMethods]);

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

  /**
   * Cargar cargos administrativos pendientes (Ajuste en contra, Interés aplicado)
   */
  const loadAdministrativeCharges = useCallback(async () => {
    try {
      setLoadingCharges(true);
      const charges = await CurrentAccountService.getAdministrativeCharges(accountId);
      setAdministrativeCharges(charges);
      
      // Inicializar formulario de cargos
      const initialForm: ChargePaymentForm = {};
      charges.forEach(charge => {
        initialForm[charge.id] = {
          selected: false,
          amount: charge.pending_amount.toFixed(2)
        };
      });
      setChargePayments(initialForm);
    } catch (error) {
      console.error('Error loading administrative charges:', error);
      toast.error('Error al cargar cargos administrativos');
    } finally {
      setLoadingCharges(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (open) {
      loadPendingSales();
      loadAdministrativeCharges();
      loadAvailableFavorCredit();
      setSalePayments({});
      setChargePayments({});
      setSelectedPaymentMethod('');
      setFavorCreditAmount('');
      // Inicializar sucursal: si hay una sola, usarla automáticamente; si hay múltiples, usar la actual
      if (branches.length === 1) {
        setSelectedBranchId(branches[0].id);
      } else if (currentBranch) {
        setSelectedBranchId(currentBranch.id);
      } else {
        setSelectedBranchId('');
      }
    }
  }, [open, accountId, loadPendingSales, loadAdministrativeCharges, loadAvailableFavorCredit, branches, currentBranch]);

  // Actualizar el monto de crédito a favor cuando cambia el método de pago o el total
  useEffect(() => {
    const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
    const isFavorCredit = selectedMethod && (
      selectedMethod.name.toLowerCase().includes('crédito a favor') || 
      selectedMethod.name.toLowerCase().includes('credito a favor')
    );
    
    if (isFavorCredit && availableFavorCredit > 0) {
      // Si no hay un valor manual, usar el mínimo entre el total y el crédito disponible
      if (!favorCreditAmount || parseFloat(favorCreditAmount) === 0) {
        const totalAmount = calculateTotal();
        const suggestedAmount = Math.min(totalAmount, availableFavorCredit);
        setFavorCreditAmount(suggestedAmount.toFixed(2));
      }
    } else {
      setFavorCreditAmount('');
    }
  }, [selectedPaymentMethod, availableFavorCredit, paymentMethods, favorCreditAmount]);

  // Actualizar automáticamente los montos de las ventas cuando se ingresa crédito a favor
  useEffect(() => {
    const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
    const isFavorCredit = selectedMethod && (
      selectedMethod.name.toLowerCase().includes('crédito a favor') || 
      selectedMethod.name.toLowerCase().includes('credito a favor')
    );
    
    if (isFavorCredit && favorCreditAmount) {
      const creditToUse = parseFloat(favorCreditAmount) || 0;
      
      if (creditToUse > 0) {
        // Obtener ventas seleccionadas con sus montos pendientes
        const selectedSales = pendingSales.filter(sale => salePayments[sale.id]?.selected);
        
        if (selectedSales.length > 0) {
          // Calcular el total pendiente de las ventas seleccionadas
          const totalPending = selectedSales.reduce((sum, sale) => sum + sale.pending_amount, 0);
          
          // Distribuir el crédito proporcionalmente según el monto pendiente de cada venta
          let remainingCredit = creditToUse;
          const updatedPayments = { ...salePayments };
          
          selectedSales.forEach((sale, index) => {
            if (remainingCredit <= 0) {
              // Si ya se agotó el crédito, dejar el monto en 0
              updatedPayments[sale.id] = {
                ...updatedPayments[sale.id],
                amount: '0.00'
              };
              return;
            }
            
            // Calcular cuánto crédito corresponde a esta venta (proporcional)
            let creditForThisSale: number;
            
            if (index === selectedSales.length - 1) {
              // Para la última venta, usar todo el crédito restante
              creditForThisSale = Math.min(remainingCredit, sale.pending_amount);
            } else {
              // Distribución proporcional
              const proportion = sale.pending_amount / totalPending;
              creditForThisSale = Math.min(creditToUse * proportion, sale.pending_amount, remainingCredit);
            }
            
            // Actualizar el monto a pagar de esta venta con el crédito asignado
            updatedPayments[sale.id] = {
              ...updatedPayments[sale.id],
              amount: creditForThisSale.toFixed(2)
            };
            
            remainingCredit -= creditForThisSale;
          });
          
          setSalePayments(updatedPayments);
        }
      }
    } else if (!isFavorCredit && selectedPaymentMethod) {
      // Si no es crédito a favor, restaurar los montos originales (pendientes completos)
      const updatedPayments = { ...salePayments };
      pendingSales.forEach(sale => {
        if (updatedPayments[sale.id]?.selected) {
          updatedPayments[sale.id] = {
            ...updatedPayments[sale.id],
            amount: sale.pending_amount.toFixed(2)
          };
        }
      });
      setSalePayments(updatedPayments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorCreditAmount, selectedPaymentMethod]);

  const handleSaleSelection = (saleId: number, selected: boolean) => {
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
   * Manejar selección de cargo administrativo
   */
  const handleChargeSelection = (chargeId: number, selected: boolean) => {
    setChargePayments(prev => ({
      ...prev,
      [chargeId]: {
        ...prev[chargeId],
        selected
      }
    }));
  };

  /**
   * Manejar cambio de monto de cargo administrativo
   */
  const handleChargeAmountChange = (chargeId: number, amount: string) => {
    const charge = administrativeCharges.find(c => c.id === chargeId);
    if (charge) {
      const numAmount = parseFloat(amount) || 0;
      const maxAmount = charge.pending_amount;
      
      if (numAmount > maxAmount) {
        toast.warning(`El monto no puede exceder el pendiente de $${maxAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
        setChargePayments(prev => ({
          ...prev,
          [chargeId]: {
            ...prev[chargeId],
            amount: maxAmount.toFixed(2)
          }
        }));
        return;
      }
    }
    
    setChargePayments(prev => ({
      ...prev,
      [chargeId]: {
        ...prev[chargeId],
        amount
      }
    }));
  };

  /**
   * Calcular el total a pagar incluyendo ventas y cargos administrativos
   */
  const calculateTotal = (): number => {
    // Total de ventas seleccionadas
    const salesTotal = Object.entries(salePayments).reduce((sum, [saleId, payment]) => {
      if (payment.selected) {
        const sale = pendingSales.find(s => s.id === parseInt(saleId));
        const amount = parseFloat(payment.amount) || 0;
        const maxAmount = sale ? sale.pending_amount : amount;
        const validAmount = Math.min(amount, maxAmount);
        return sum + validAmount;
      }
      return sum;
    }, 0);
    
    // Total de cargos seleccionados
    const chargesTotal = Object.entries(chargePayments).reduce((sum, [chargeId, payment]) => {
      if (payment.selected) {
        const charge = administrativeCharges.find(c => c.id === parseInt(chargeId));
        const amount = parseFloat(payment.amount) || 0;
        const maxAmount = charge ? charge.pending_amount : amount;
        const validAmount = Math.min(amount, maxAmount);
        return sum + validAmount;
      }
      return sum;
    }, 0);
    
    return salesTotal + chargesTotal;
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

    // Recolectar cargos administrativos seleccionados
    const selectedCharges: ChargePayment[] = [];
    Object.entries(chargePayments).forEach(([chargeId, payment]) => {
      if (payment.selected) {
        const amount = parseFloat(payment.amount);
        if (amount > 0) {
          selectedCharges.push({
            charge_id: parseInt(chargeId),
            amount
          });
        }
      }
    });

    // Validar que haya al menos una venta o un cargo seleccionado
    if (selectedSales.length === 0 && selectedCharges.length === 0) {
      toast.error('Selecciona al menos una venta o un cargo administrativo para pagar');
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

    // Validar montos de los cargos administrativos seleccionados
    for (const chargePayment of selectedCharges) {
      const charge = administrativeCharges.find(c => c.id === chargePayment.charge_id);
      if (!charge) {
        toast.error(`Cargo administrativo #${chargePayment.charge_id} no encontrado`);
        return;
      }
      
      if (chargePayment.amount <= 0) {
        toast.error(`El monto debe ser mayor a 0 para el cargo "${charge.description}"`);
        return;
      }
      
      if (chargePayment.amount > charge.pending_amount) {
        toast.error(`El pago de $${chargePayment.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} excede el monto pendiente de $${charge.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} para el cargo "${charge.description}"`);
        return;
      }
    }

    // Validar sucursal si hay cargos administrativos seleccionados
    // Los cargos administrativos no tienen sucursal asociada, necesitamos saber en qué sucursal registrar el movimiento de caja
    if (selectedCharges.length > 0) {
      if (branches.length > 1 && !selectedBranchId) {
        toast.error('Debes seleccionar una sucursal para procesar el pago de cargos administrativos');
        return;
      }
      // Si solo hay una sucursal pero no está seleccionada, seleccionarla automáticamente
      if (branches.length === 1 && !selectedBranchId) {
        setSelectedBranchId(branches[0].id);
      }
    }

    // Validar crédito a favor si se seleccionó como método de pago
    const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
    const isFavorCredit = selectedMethod && (
      selectedMethod.name.toLowerCase().includes('crédito a favor') || 
      selectedMethod.name.toLowerCase().includes('credito a favor')
    );
    
    if (isFavorCredit) {
      const creditToUse = parseFloat(favorCreditAmount || '0') || 0;
      
      if (creditToUse <= 0) {
        toast.error('Debes especificar un monto de crédito a favor mayor a 0');
        return;
      }
      
      if (creditToUse > availableFavorCredit) {
        toast.error(`El monto de crédito (${creditToUse.toLocaleString('es-AR', { minimumFractionDigits: 2 })}) excede el crédito disponible (${availableFavorCredit.toLocaleString('es-AR', { minimumFractionDigits: 2 })})`);
        return;
      }
      
      if (creditToUse > totalAmount) {
        toast.error(`El monto de crédito (${creditToUse.toLocaleString('es-AR', { minimumFractionDigits: 2 })}) excede el total a pagar (${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })})`);
        return;
      }
      
      // Si se usa crédito a favor, puede ser para ventas y/o cargos administrativos
      const paymentData: ProcessPaymentWithChargesData = {
        payment_method_id: parseInt(selectedPaymentMethod),
        favor_credit_amount: creditToUse,
        ...(selectedBranchId ? { branch_id: parseInt(selectedBranchId) } : {})
      };
      
      // Incluir ventas solo si hay alguna seleccionada
      if (selectedSales.length > 0) {
        paymentData.sale_payments = selectedSales;
      }
      
      // Incluir cargos solo si hay alguno seleccionado
      if (selectedCharges.length > 0) {
        paymentData.charge_payments = selectedCharges;
      }
      
      try {
        setLoading(true);
        
        const result = await CurrentAccountService.processPaymentBySale(accountId, paymentData);
        
        // Si es un pago parcial solo con crédito a favor, mostrar mensaje específico
        if (result?.is_partial_payment) {
          const remainingAmount = totalAmount - creditToUse;
          toast.success(
            `Pago parcial procesado: Se aplicaron $${creditToUse.toLocaleString('es-AR', { minimumFractionDigits: 2 })} de crédito a favor. Restante pendiente: $${remainingAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
            { duration: 5000 }
          );
        } else {
          toast.success('Pago procesado exitosamente');
        }
        
        onSuccess();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error processing payment:', error);
        const message = error?.response?.data?.message || error?.message || 'Error al procesar el pago';
        toast.error(message);
      } finally {
        setLoading(false);
      }
      
      return;
    }

    // Procesar pago normal (con método de pago real, no crédito a favor)
    try {
      setLoading(true);
      
      const paymentData: ProcessPaymentWithChargesData = {
        payment_method_id: parseInt(selectedPaymentMethod),
        ...(selectedBranchId ? { branch_id: parseInt(selectedBranchId) } : {})
      };
      
      // Incluir ventas solo si hay alguna seleccionada
      if (selectedSales.length > 0) {
        paymentData.sale_payments = selectedSales;
      }
      
      // Incluir cargos solo si hay alguno seleccionado
      if (selectedCharges.length > 0) {
        paymentData.charge_payments = selectedCharges;
      }
      
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
              <span className="text-sm font-medium">Total a Pagar:</span>
              <span className={`font-bold text-lg ${totalAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {loadingSales || loadingCharges ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingSales.length === 0 && administrativeCharges.length === 0 ? (
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
                      {pendingSales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <Checkbox
                              checked={salePayments[sale.id]?.selected || false}
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </div>
              )}

              {/* Sección de Cargos Administrativos */}
              {administrativeCharges.length > 0 && (
                <>
                  <div className="space-y-2 mt-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <Label className="text-base font-semibold">Cargos Administrativos Pendientes</Label>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                      <p className="text-xs text-amber-800">
                        Estos cargos administrativos (Ajuste en contra, Interés aplicado) no están asociados a ventas.
                      </p>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                            <TableHead className="text-right">Monto a Pagar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {administrativeCharges.map(charge => (
                            <TableRow key={charge.id}>
                              <TableCell>
                                <Checkbox
                                  checked={chargePayments[charge.id]?.selected || false}
                                  onCheckedChange={(checked) => 
                                    handleChargeSelection(charge.id, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">{charge.movement_type}</TableCell>
                              <TableCell>{charge.description}</TableCell>
                              <TableCell className="text-right">
                                ${charge.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                ${charge.paid_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                ${charge.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={charge.pending_amount}
                                    value={chargePayments[charge.id]?.amount || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const numValue = parseFloat(value) || 0;
                                      if (value && numValue > charge.pending_amount) {
                                        handleChargeAmountChange(charge.id, charge.pending_amount.toFixed(2));
                                        toast.warning(`El monto máximo para este cargo es $${charge.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
                                      } else {
                                        handleChargeAmountChange(charge.id, value);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const numValue = parseFloat(e.target.value) || 0;
                                      if (numValue > charge.pending_amount) {
                                        handleChargeAmountChange(charge.id, charge.pending_amount.toFixed(2));
                                      } else if (numValue < 0) {
                                        handleChargeAmountChange(charge.id, '0.00');
                                      }
                                    }}
                                    disabled={!chargePayments[charge.id]?.selected}
                                    className="pl-10"
                                    placeholder="0.00"
                                  />
                                </div>
                                {chargePayments[charge.id]?.selected && parseFloat(chargePayments[charge.id]?.amount || '0') > charge.pending_amount && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Máximo permitido: ${charge.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {/* Selector de sucursal para cargos administrativos */}
              {(() => {
                const hasSelectedCharges = Object.values(chargePayments).some(p => p.selected);
                const needsBranchSelection = hasSelectedCharges && branches.length > 1;
                
                if (!needsBranchSelection) return null;
                
                return (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="branch_id">Sucursal *</Label>
                    <Select
                      value={selectedBranchId}
                      onValueChange={setSelectedBranchId}
                    >
                      <SelectTrigger id="branch_id">
                        <SelectValue placeholder="Selecciona una sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecciona la sucursal donde se registrará el movimiento de caja para los cargos administrativos.
                    </p>
                  </div>
                );
              })()}

              {/* Mostrar crédito disponible siempre que haya crédito */}
              {availableFavorCredit > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-800">Crédito a favor disponible:</span>
                    <span className="text-lg font-bold text-green-900">
                      ${availableFavorCredit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-green-700">
                    Puedes usar este crédito para pagar las ventas seleccionadas. Selecciona "Crédito a favor" como método de pago y elige cuánto usar.
                  </p>
                </div>
              )}

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
                
                {/* Mostrar campo para especificar monto de crédito a usar si se selecciona "Crédito a favor" */}
                {selectedPaymentMethod && (() => {
                  const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
                  const isFavorCredit = selectedMethod && (
                    selectedMethod.name.toLowerCase().includes('crédito a favor') || 
                    selectedMethod.name.toLowerCase().includes('credito a favor')
                  );
                  
                  if (!isFavorCredit || availableFavorCredit <= 0) {
                    return null;
                  }
                  
                  // Calcular el total pendiente de las ventas seleccionadas (sin ajustar por crédito)
                  const totalPendingSales = pendingSales
                    .filter(sale => salePayments[sale.id]?.selected)
                    .reduce((sum, sale) => sum + sale.pending_amount, 0);
                  
                  // Calcular el total pendiente de los cargos administrativos seleccionados
                  const totalPendingCharges = administrativeCharges
                    .filter(charge => chargePayments[charge.id]?.selected)
                    .reduce((sum, charge) => sum + charge.pending_amount, 0);
                  
                  // El total pendiente incluye ventas + cargos administrativos
                  const totalPendingSelected = totalPendingSales + totalPendingCharges;
                  
                  // El máximo permitido es el mínimo entre el crédito disponible y el total pendiente
                  const maxCreditAllowed = Math.min(availableFavorCredit, totalPendingSelected);
                  
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="favor_credit_amount" className="text-sm font-semibold text-blue-900">
                          ¿Cuánto crédito quieres usar?
                        </Label>
                        <span className="text-xs text-blue-700">
                          Máximo: ${maxCreditAllowed.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="favor_credit_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          max={maxCreditAllowed}
                          value={favorCreditAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseFloat(value) || 0;
                            
                            if (value && numValue > maxCreditAllowed) {
                              // Limitar automáticamente al máximo permitido
                              setFavorCreditAmount(maxCreditAllowed.toFixed(2));
                              toast.warning(`El monto máximo de crédito disponible es $${maxCreditAllowed.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
                            } else {
                              setFavorCreditAmount(value);
                            }
                          }}
                          onBlur={(e) => {
                            // Asegurar que el valor final no exceda los límites
                            const numValue = parseFloat(e.target.value) || 0;
                            if (numValue > maxCreditAllowed) {
                              setFavorCreditAmount(maxCreditAllowed.toFixed(2));
                            } else if (numValue < 0) {
                              setFavorCreditAmount('0.00');
                            }
                          }}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                      {parseFloat(favorCreditAmount || '0') > availableFavorCredit && (
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ El monto excede el crédito disponible (${availableFavorCredit.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                        </p>
                      )}
                      {(() => {
                        const totalPendingSales = pendingSales
                          .filter(sale => salePayments[sale.id]?.selected)
                          .reduce((sum, sale) => sum + sale.pending_amount, 0);
                        const totalPendingCharges = administrativeCharges
                          .filter(charge => chargePayments[charge.id]?.selected)
                          .reduce((sum, charge) => sum + charge.pending_amount, 0);
                        const totalPendingSelected = totalPendingSales + totalPendingCharges;
                        return parseFloat(favorCreditAmount || '0') > totalPendingSelected && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ El monto excede el total pendiente (${totalPendingSelected.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                          </p>
                        );
                      })()}
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Calcular el total pendiente de las ventas seleccionadas
                            const totalPendingSales = pendingSales
                              .filter(sale => salePayments[sale.id]?.selected)
                              .reduce((sum, sale) => sum + sale.pending_amount, 0);
                            // Calcular el total pendiente de los cargos administrativos seleccionados
                            const totalPendingCharges = administrativeCharges
                              .filter(charge => chargePayments[charge.id]?.selected)
                              .reduce((sum, charge) => sum + charge.pending_amount, 0);
                            // El total pendiente incluye ventas + cargos administrativos
                            const totalPendingSelected = totalPendingSales + totalPendingCharges;
                            const maxValue = Math.min(availableFavorCredit, totalPendingSelected);
                            setFavorCreditAmount(maxValue.toFixed(2));
                          }}
                          className="text-xs flex-1"
                        >
                          Usar máximo disponible
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFavorCreditAmount('')}
                          className="text-xs"
                        >
                          Limpiar
                        </Button>
                      </div>
                      {favorCreditAmount && parseFloat(favorCreditAmount) > 0 && (
                        <div className="bg-white rounded p-2 border border-blue-200">
                          <div className="text-xs text-blue-800">
                            <strong>Resumen:</strong> Usarás ${parseFloat(favorCreditAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })} de crédito.
                            {parseFloat(favorCreditAmount) < totalAmount && (
                              <span className="block mt-1">
                                Restante a pagar: ${(totalAmount - parseFloat(favorCreditAmount)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Total a Pagar:</span>
                  <span className="text-2xl font-bold text-primary">
                    {(() => {
                      // Si se seleccionó "Crédito a favor", mostrar solo el monto de crédito a usar
                      const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
                      const isFavorCredit = selectedMethod && (
                        selectedMethod.name.toLowerCase().includes('crédito a favor') || 
                        selectedMethod.name.toLowerCase().includes('credito a favor')
                      );
                      
                      if (isFavorCredit && favorCreditAmount) {
                        const creditAmount = parseFloat(favorCreditAmount) || 0;
                        return `$${creditAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                      
                      // Si no es crédito a favor, mostrar el total normal
                      return `$${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    })()}
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
                if (loading || loadingSales || loadingCharges) return true;
                
                // Validar que haya al menos una venta o un cargo seleccionado
                const hasSelectedSales = Object.values(salePayments).some(p => p.selected);
                const hasSelectedCharges = Object.values(chargePayments).some(p => p.selected);
                
                if (!hasSelectedSales && !hasSelectedCharges) return true;
                
                // Si se seleccionó "Crédito a favor", validar que haya un monto de crédito especificado
                const selectedMethod = paymentMethods.find(m => m.id.toString() === selectedPaymentMethod);
                const isFavorCredit = selectedMethod && (
                  selectedMethod.name.toLowerCase().includes('crédito a favor') || 
                  selectedMethod.name.toLowerCase().includes('credito a favor')
                );
                
                if (isFavorCredit) {
                  const creditAmount = parseFloat(favorCreditAmount || '0') || 0;
                  if (creditAmount <= 0) return true;
                  
                  // Si hay cargos administrativos seleccionados, validar que haya sucursal seleccionada
                  if (hasSelectedCharges && branches.length > 1 && !selectedBranchId) {
                    return true;
                  }
                  
                  return false; // Habilitar el botón
                }
                
                // Si no es crédito a favor, validar que haya un método de pago y un total a pagar
                if (!selectedPaymentMethod) return true;
                
                // Si hay cargos administrativos seleccionados, validar que haya sucursal seleccionada
                if (hasSelectedCharges && branches.length > 1 && !selectedBranchId) {
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
