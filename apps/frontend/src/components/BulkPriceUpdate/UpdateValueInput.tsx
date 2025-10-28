import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Percent, DollarSign } from 'lucide-react';

interface UpdateValueInputProps {
  type: 'percentage' | 'fixed';
  value: string;
  onChange: (value: string) => void;
}

export const UpdateValueInput: React.FC<UpdateValueInputProps> = ({ type, value, onChange }) => {
  const isPercentage = type === 'percentage';

  return (
    <div className="space-y-2">
      <Label htmlFor="updateValue" className="text-base font-semibold">
        Valor de {isPercentage ? 'Porcentaje' : 'Monto Fijo'}
      </Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {isPercentage ? (
            <Percent className="w-4 h-4" />
          ) : (
            <DollarSign className="w-4 h-4" />
          )}
        </div>
        <Input
          id="updateValue"
          type="number"
          step={isPercentage ? '0.01' : '1'}
          placeholder={isPercentage ? 'Ej: 10 (para +10%)' : 'Ej: 100 (para +$100)'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <p className="text-sm text-gray-500">
        {isPercentage ? (
          <>
            Usa valores positivos para aumentar (ej: 10 = +10%) o negativos para disminuir (ej: -5 = -5%)
          </>
        ) : (
          <>
            Usa valores positivos para aumentar (ej: 100 = +$100) o negativos para disminuir (ej: -50 = -$50)
          </>
        )}
      </p>
    </div>
  );
};
