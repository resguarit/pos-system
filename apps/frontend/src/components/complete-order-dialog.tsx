import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import paymentMethodService, { type PaymentMethod } from '@/lib/api/paymentMethodService';
import { Loader2, CreditCard, Banknote, Building2, CreditCard as CardIcon, DollarSign } from 'lucide-react';

interface CompleteOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  orderTotal: number;
  supplierName: string;
  onComplete: (paymentMethodId: number) => Promise<void>;
}

export default function CompleteOrderDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  orderTotal, 
  supplierName, 
  onComplete 
}: CompleteOrderDialogProps) {
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open) {
      loadPaymentMethods();
    }
  }, [open]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentMethodService.getAll();
      setPaymentMethods(methods);
      
      // Pre-seleccionar "Transferencia" si está disponible, sino el primero
      const transferencia = methods.find(m => m.name.toLowerCase().includes('transferencia'));
      if (transferencia) {
        setSelectedPaymentMethod(transferencia.id.toString());
      } else if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id.toString());
      }
    } catch (error: any) {
      toast.error("Error al cargar métodos de pago", {
        description: error.message || "No se pudieron cargar los métodos de pago disponibles"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedPaymentMethod) {
      toast.error("Selecciona un método de pago", {
        description: "Debes seleccionar un método de pago para completar la orden"
      });
      return;
    }

    try {
      setCompleting(true);
      await onComplete(parseInt(selectedPaymentMethod));
      onOpenChange(false);
      setSelectedPaymentMethod('');
    } catch (error: any) {
      toast.error("Error al completar la orden", {
        description: error.message || "No se pudo completar la orden de compra"
      });
    } finally {
      setCompleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getPaymentMethodIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('efectivo')) return <Banknote className="h-4 w-4" />;
    if (lowerName.includes('transferencia')) return <Building2 className="h-4 w-4" />;
    if (lowerName.includes('tarjeta')) return <CardIcon className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Completar Orden de Compra
          </DialogTitle>
          <DialogDescription>
            Selecciona el método de pago para completar la orden y registrar el movimiento de caja
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
          {/* Información de la orden */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Detalles de la Orden</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Orden:</span> #{orderId}</p>
              <p><span className="font-medium">Proveedor:</span> {supplierName}</p>
              <p><span className="font-medium">Total:</span> <span className="font-bold text-green-600">{formatCurrency(orderTotal)}</span></p>
            </div>
          </div>

          {/* Selección de método de pago */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Método de Pago
            </Label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-gray-600">Cargando métodos de pago...</span>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay métodos de pago disponibles
              </div>
            ) : (
              <RadioGroup 
                value={selectedPaymentMethod} 
                onValueChange={setSelectedPaymentMethod}
                className="space-y-3"
              >
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} />
                    <Label 
                      htmlFor={`method-${method.id}`} 
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-lg">{getPaymentMethodIcon(method.name)}</span>
                      <span className="font-medium">{method.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={completing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={!selectedPaymentMethod || loading || completing}
            className="bg-green-600 hover:bg-green-700"
          >
            {completing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completando...
              </>
            ) : (
              'Completar Orden'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
