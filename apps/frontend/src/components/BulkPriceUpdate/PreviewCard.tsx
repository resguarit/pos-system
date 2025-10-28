import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';

interface PreviewCardProps {
  count: number;
  totalCurrent: number;
  totalNew: number;
  totalDifference: number;
  updateType: 'percentage' | 'fixed';
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  count,
  totalCurrent,
  totalNew,
  totalDifference,
  updateType,
}) => {
  const isIncrease = totalDifference > 0;
  const percentageChange = totalCurrent > 0 ? (totalDifference / totalCurrent) * 100 : 0;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Vista Previa de Cambios
        </CardTitle>
        <CardDescription>
          Resumen de la actualización que se aplicará
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Productos afectados */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Productos</span>
              <Package className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-gray-500 mt-1">Afectados</p>
          </div>

          {/* Total actual */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Actual</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">${Number(totalCurrent || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Suma de precios</p>
          </div>

          {/* Total nuevo */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Nuevo</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">${Number(totalNew || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Después de actualizar</p>
          </div>

          {/* Diferencia */}
          <div className={`bg-white p-4 rounded-lg border ${isIncrease ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Diferencia</span>
              {isIncrease ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
              {isIncrease ? '+' : ''}${Number(totalDifference || 0).toFixed(2)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isIncrease ? 'default' : 'destructive'} className="text-xs">
                {isIncrease ? '+' : ''}{Number(percentageChange || 0).toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Esta es una vista previa. Los precios se actualizarán al confirmar la operación.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
