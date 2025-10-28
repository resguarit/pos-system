import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { UpdateConfigurationProps } from '@/types/bulkPriceUpdate';

export const UpdateConfiguration: React.FC<UpdateConfigurationProps> = ({
  updateType,
  updateValue,
  selectedProductsCount,
  isValidUpdateValue,
  updating,
  onUpdateTypeChange,
  onUpdateValueChange,
  onUpdatePrices,
  onCancel,
}) => {
  const handleUpdatePrices = () => {
    onUpdatePrices();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuración de Actualización</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="updateType">Tipo de Actualización</Label>
            <Select value={updateType} onValueChange={onUpdateTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Valor Fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="updateValue">
              {updateType === 'percentage' ? 'Porcentaje' : 'Valor Fijo'}
            </Label>
            <Input
              id="updateValue"
              type="number"
              placeholder={updateType === 'percentage' ? 'Ej: 10' : 'Ej: 100'}
              value={updateValue}
              onChange={(e) => onUpdateValueChange(e.target.value)}
              aria-label={`Ingresar ${updateType === 'percentage' ? 'porcentaje' : 'valor fijo'}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedProductsCount > 0 && (
              <span>
                {selectedProductsCount} producto(s) seleccionado(s) para actualizar
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePrices}
              disabled={updating || selectedProductsCount === 0 || !isValidUpdateValue}
              aria-label="Actualizar precios de productos seleccionados"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Precios'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
