import { CartHeader } from "./CartHeader";
import { EmptyCartState } from "./EmptyCartState";
import { CartItemsTable } from "./CartItemsTable";
import { CartSummary } from "./CartSummary";

interface CartItem {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
}

interface ShoppingCartProps {
  items: CartItem[];
  subtotalNet: number;
  totalIva: number;
  totalItemDiscount: number;
  globalDiscountAmount: number;
  total: number;
  formatCurrency: (amount: number) => string;
  onClearCart: () => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCompleteSale: () => void;
}

/**
 * Componente principal del carrito de compras
 * Aplica principios SOLID:
 * - SRP: Cada componente tiene una sola responsabilidad
 * - OCP: Abierto para extensión, cerrado para modificación
 * - DIP: Depende de abstracciones (props), no de implementaciones concretas
 */
export const ShoppingCart = ({
  items,
  subtotalNet,
  totalIva,
  totalItemDiscount,
  globalDiscountAmount,
  total,
  formatCurrency,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  onCompleteSale
}: ShoppingCartProps) => {
  const hasItems = items.length > 0;

  return (
    <div className="w-full border-t lg:w-[400px] xl:w-[500px] lg:border-l lg:border-t-0 max-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header del carrito - Fijo */}
      <CartHeader 
        itemCount={items.length} 
        onClearCart={onClearCart} 
      />

      {/* Contenido del carrito - Deslizable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasItems ? (
          <EmptyCartState />
        ) : (
          <CartItemsTable
            items={items}
            formatCurrency={formatCurrency}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
        )}
      </div>

      {/* Resumen y botón - Fijo */}
      <CartSummary
        subtotalNet={subtotalNet}
        totalIva={totalIva}
        totalItemDiscount={totalItemDiscount}
        globalDiscountAmount={globalDiscountAmount}
        total={total}
        formatCurrency={formatCurrency}
        onCompleteSale={onCompleteSale}
        isDisabled={!hasItems}
      />
    </div>
  );
};
