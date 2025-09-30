import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertTriangle } from 'lucide-react';
import exchangeRateService from '@/lib/api/exchangeRateService';
import { toast } from 'sonner';
import { useRefresh } from '@/context/RefreshContext';

interface UpdateExchangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentRate?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

export function UpdateExchangeRateDialog({
  open,
  onOpenChange,
  onSuccess,
  currentRate = 1
}: UpdateExchangeRateDialogProps) {
  const [rate, setRate] = useState(currentRate.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { triggerRefresh } = useRefresh(); // Obtener la función de refresco global

  // Actualizar el rate cuando cambie currentRate o cuando se abra el diálogo
  useEffect(() => {
    if (open) {
      setRate(currentRate.toString());
      setError(null); // Limpiar errores previos
    }
  }, [open, currentRate]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const newRate = parseFloat(rate);
      
      if (isNaN(newRate) || newRate <= 0) {
        setError('El valor debe ser un número positivo válido');
        return;
      }

      const success = await exchangeRateService.updateRate('USD', 'ARS', newRate);

      if (success) {
        toast.success('Precio del dólar actualizado', {
          description: `1 USD = $${newRate.toFixed(2)} ARS`
        });
        
        // PASO CRÍTICO: Disparar el refresco global
        triggerRefresh();
        
        onSuccess?.();
        onOpenChange(false);
        
        // Reset form
        setRate(currentRate.toString());
      } else {
        setError('No se pudo actualizar el precio del dólar');
      }
    } catch (err: any) {
      console.error('Error al actualizar precio:', err);
      setError(err?.response?.data?.message || 'Error al actualizar el precio del dólar');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setRate(value);
    if (error) setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cambiar Precio del Dólar
          </DialogTitle>
          <DialogDescription>
            Establecer el nuevo precio del dólar estadounidense en pesos argentinos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Rate Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rate" className="text-right">
              Precio USD
            </Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0.01"
              value={rate}
              onChange={(e) => handleInputChange(e.target.value)}
              className="col-span-3"
              placeholder="Ej: 1200.50"
            />
          </div>

          {/* Preview */}
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>Vista previa:</strong>
            </div>
            <div className="text-lg font-mono text-blue-900">
              1 USD = ${parseFloat(rate || '0').toFixed(2)} ARS
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar Precio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
