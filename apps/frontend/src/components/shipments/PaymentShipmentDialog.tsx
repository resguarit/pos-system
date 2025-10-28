import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { shipmentService } from '@/services/shipmentService';

interface PaymentShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: number | null;
  shippingCost: number;
  onSuccess: () => void;
}

export const PaymentShipmentDialog: React.FC<PaymentShipmentDialogProps> = ({
  open,
  onOpenChange,
  shipmentId,
  shippingCost,
  onSuccess,
}) => {
  const { request } = useApi() as any;
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchPaymentMethods();
    } else {
      setSelectedPaymentMethod('');
      setNotes('');
    }
  }, [open]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await request({ method: 'GET', url: '/payment-methods' });
      if (response?.data) {
        const methods = Array.isArray(response.data) ? response.data : response.data.data || [];
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    }
  };

  const handlePay = async () => {
    if (!shipmentId) return;
    if (!selectedPaymentMethod) {
      toast.error('Selecciona un método de pago');
      return;
    }

    try {
      setLoading(true);
      await shipmentService.payShipment(shipmentId, {
        payment_method_id: parseInt(selectedPaymentMethod),
        notes: notes || undefined,
      });

      toast.success('Pago registrado exitosamente');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error paying shipment:', err);
      toast.error(err.response?.data?.error?.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Envío</DialogTitle>
          <DialogDescription>
            Registra el pago del costo de envío
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Costo de Envío</p>
            <p className="text-2xl font-bold text-blue-900">
              ${shippingCost.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Método de Pago *</label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
            >
              {/* @ts-ignore */}
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un método de pago" />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent>
                {paymentMethods.map((method) => (
                  // @ts-ignore
                  <SelectItem key={method.id} value={method.id.toString()}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas (Opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el pago..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handlePay}
            disabled={loading || !selectedPaymentMethod}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Registrar Pago'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

