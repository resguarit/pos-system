import React, { useState, useEffect } from 'react';
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
import { PendingSale, SalePayment } from '@/types/currentAccount';
import { CurrentAccountService } from '@/lib/services/currentAccountService';
import { usePermissions } from '@/hooks/usePermissions';
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
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (open) {
      loadPendingSales();
      loadPaymentMethods();
      setSalePayments({});
      setSelectedPaymentMethod('');
    }
  }, [open, accountId]);

  const loadPendingSales = async () => {
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
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await api.get('/payment-methods');
      setPaymentMethods(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoadingMethods(false);
    }
  };

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
    setSalePayments(prev => ({
      ...prev,
      [saleId]: {
        ...prev[saleId],
        amount
      }
    }));
  };

  const calculateTotal = (): number => {
    return Object.entries(salePayments).reduce((total, [saleId, payment]) => {
      if (payment.selected) {
        const amount = parseFloat(payment.amount) || 0;
        return total + amount;
      }
      return total;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
      toast.error('Selecciona un método de pago');
      return;
    }

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

    if (selectedSales.length === 0) {
      toast.error('Selecciona al menos una venta para pagar');
      return;
    }

    // Validar montos
    for (const salePayment of selectedSales) {
      const sale = pendingSales.find(s => s.id === salePayment.sale_id);
      if (sale && salePayment.amount > sale.pending_amount) {
        toast.error(`El pago de la venta #${sale.receipt_number} excede el monto pendiente`);
        return;
      }
    }

    try {
      setLoading(true);
      
      await CurrentAccountService.processPaymentBySale(accountId, {
        sale_payments: selectedSales,
        payment_method_id: parseInt(selectedPaymentMethod)
      });

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
            Procesar Pago por Venta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saldo Adeudado:</span>
              <span className={`font-bold ${totalPendingDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
              No hay ventas pendientes de pago
            </div>
          ) : (
            <>
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
                                onChange={(e) => handleAmountChange(sale.id, e.target.value)}
                                disabled={!salePayments[sale.id]?.selected}
                                className="pl-10"
                                placeholder="0.00"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

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
              disabled={loading || loadingSales || pendingSales.length === 0 || totalAmount === 0}
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
