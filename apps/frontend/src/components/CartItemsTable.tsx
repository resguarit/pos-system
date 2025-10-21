import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Minus, Plus, Trash2 } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
}

interface CartItemRowProps {
  item: CartItem;
  formatCurrency: (amount: number) => string;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

/**
 * Componente responsable únicamente de renderizar una fila del carrito
 * Principio de Responsabilidad Única (SRP)
 */
export const CartItemRow = ({ 
  item, 
  formatCurrency, 
  onUpdateQuantity, 
  onRemoveItem 
}: CartItemRowProps) => {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onUpdateQuantity(item.id, newQuantity);
  };

  const renderDiscountInfo = () => {
    if (!item.discount_type || (item.discount_value ?? 0) <= 0) {
      return null;
    }

    const discountText = item.discount_type === 'percent' 
      ? `${item.discount_value}%` 
      : formatCurrency(Number(item.discount_value));

    return (
      <span className="ml-1 sm:ml-2 text-amber-700 text-xs">
        Desc: {discountText}
      </span>
    );
  };

  return (
    <TableRow>
      <TableCell className="font-medium py-1 sm:py-2">
        <div className="text-xs sm:text-sm truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(item.sale_price)} c/u
          {renderDiscountInfo()}
        </div>
      </TableCell>
      
      <TableCell className="py-1 sm:py-2">
        <div className="flex items-center justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" 
            onClick={() => handleQuantityChange(-1)}
            aria-label={`Reducir cantidad de ${item.name}`}
          >
            <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
          <span className="w-5 sm:w-6 lg:w-8 text-center text-xs sm:text-sm">
            {item.quantity}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" 
            onClick={() => handleQuantityChange(1)}
            aria-label={`Aumentar cantidad de ${item.name}`}
          >
            <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </TableCell>
      
      <TableCell className="text-right text-xs sm:text-sm py-1 sm:py-2">
        {formatCurrency(item.sale_price)}
      </TableCell>
      
      <TableCell className="py-1 sm:py-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" 
          onClick={() => onRemoveItem(item.id)}
          aria-label={`Eliminar ${item.name} del carrito`}
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

interface CartItemsTableProps {
  items: CartItem[];
  formatCurrency: (amount: number) => string;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

/**
 * Componente responsable únicamente de la tabla de items del carrito
 * Principio de Responsabilidad Única (SRP)
 */
export const CartItemsTable = ({ 
  items, 
  formatCurrency, 
  onUpdateQuantity, 
  onRemoveItem 
}: CartItemsTableProps) => {
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">
              Producto
            </TableHead>
            <TableHead className="text-center w-[60px] sm:w-[80px] text-xs sm:text-sm">
              Cant.
            </TableHead>
            <TableHead className="text-right w-[80px] sm:w-[100px] text-xs sm:text-sm">
              Total
            </TableHead>
            <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              formatCurrency={formatCurrency}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
