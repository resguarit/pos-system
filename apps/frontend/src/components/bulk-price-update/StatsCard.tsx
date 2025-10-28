import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/utils/bulkPriceUpdate';
import type { StatsCardProps } from '@/types/bulkPriceUpdate';

export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_products}</div>
            <div className="text-sm text-muted-foreground">Productos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(stats.total_value)}
            </div>
            <div className="text-sm text-muted-foreground">Valor Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {formatPrice(stats.average_price)}
            </div>
            <div className="text-sm text-muted-foreground">Precio Promedio</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
