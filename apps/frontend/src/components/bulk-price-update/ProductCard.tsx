import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPrice } from '@/utils/bulkPriceUpdate';
import type { ProductCardProps } from '@/types/bulkPriceUpdate';

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  onToggleSelection,
  newPrice,
  showNewPrice = false,
}) => {
  const handleClick = () => {
    onToggleSelection(product.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleSelection(product.id);
    }
  };

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Seleccionar producto ${product.description}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelection(product.id)}
            aria-label={`Checkbox para ${product.description}`}
          />
          <div>
            <div className="font-medium">{product.description}</div>
            <div className="text-sm text-muted-foreground">
              Código: {product.code}
            </div>
            <div className="text-sm text-muted-foreground">
              {product.category?.name} • {product.supplier?.name}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">
            {formatPrice(product.unit_price, product.currency)}
          </div>
          {showNewPrice && newPrice && (
            <div className="text-sm text-green-600">
              Nuevo: {formatPrice(newPrice, product.currency)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
