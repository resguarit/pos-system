import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Percent, DollarSign } from 'lucide-react';

interface UpdateTypeSelectorProps {
  value: 'percentage' | 'fixed';
  onChange: (value: 'percentage' | 'fixed') => void;
}

export const UpdateTypeSelector: React.FC<UpdateTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Tipo de Actualización</Label>
      <RadioGroup value={value} onValueChange={onChange as any}>
        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="percentage" id="percentage" />
          <Label
            htmlFor="percentage"
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Percent className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">Porcentaje</p>
              <p className="text-sm text-gray-500">
                Aumentar o disminuir por un porcentaje (ej: +10%, -5%)
              </p>
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="fixed" id="fixed" />
          <Label
            htmlFor="fixed"
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium">Monto Fijo</p>
              <p className="text-sm text-gray-500">
                Aumentar o disminuir por un monto fijo (ej: +100, -50)
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
