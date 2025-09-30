import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useApi from '@/hooks/useApi';
import { toast } from 'sonner';
import { DollarSign, Edit, Check } from 'lucide-react';

export function ExchangeRateCard() {
  const [rate, setRate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { request } = useApi();

  const loadRate = async () => {
    setIsLoading(true);
    try {
      const response = await request({ method: 'GET', url: '/settings' });
      const settings = response.data?.data || response.data || [];
      const rateSetting = settings.find((s: any) => s.key === 'usd_exchange_rate');
      if (rateSetting && rateSetting.value) {
        setRate(rateSetting.value);
      }
    } catch (error) {
      console.error('Error al cargar la cotización:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRate();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await request({
        method: 'POST',
        url: '/settings',
        data: { settings: [{ key: 'usd_exchange_rate', value: rate }] },
      });
      toast.success('Cotización actualizada');
      setIsEditing(false);
    } catch (error) {
      toast.error('Error al actualizar la cotización');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cotización Dólar (ARS)</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="text-2xl font-bold"
              disabled={isLoading}
            />
          ) : (
            <div className="text-2xl font-bold">{rate ? `$${rate}` : 'No definida'}</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={isLoading}
          >
            {isEditing ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Valor actual para cálculos en USD
        </p>
      </CardContent>
    </Card>
  );
}
