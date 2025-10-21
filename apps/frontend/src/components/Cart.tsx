import { ShoppingCart, X, Minus, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CartItem {
  id: string;
  code: string;
  name: string;
  price: number;
  price_with_iva: number;
  sale_price: number;
  iva_rate: number;
  quantity: number;
  image: string;
  currency: string;
  iva?: { id: number; rate: number; };
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  is_combo?: boolean;
  combo_id?: number;
  combo_details?: any;
  is_from_combo?: boolean;
  combo_name?: string;
  original_combo_price?: number;
  combo_discount_applied?: number;
}

interface CartProps {
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
 * Componente de carrito optimizado con altura fija
 * Aplica principios SOLID manteniendo funcionalidad
 */
export const Cart = ({
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
}: CartProps) => {
  const hasItems = items.length > 0;

  return (
    <div className="w-full border-t lg:w-[400px] xl:w-[500px] lg:border-l lg:border-t-0 h-full flex flex-col">
      {/* Header del carrito - Fijo */}
      <div className="flex items-center justify-between border-b p-2 sm:p-3 lg:p-4 flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <ShoppingCart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
          <h2 className="text-xs sm:text-sm lg:text-base font-semibold">Carrito</h2>
          <Badge variant="secondary" className="ml-1 sm:ml-2 flex-shrink-0 text-xs">
            {items.length}
          </Badge>
          {hasItems && (
            <span className="ml-1 sm:ml-2 text-xs text-muted-foreground hidden lg:inline">
              (guardado automáticamente)
            </span>
          )}
        </div>
        {hasItems && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearCart} 
            className="flex-shrink-0 h-6 sm:h-7 px-1 sm:px-2"
            aria-label="Limpiar carrito"
          >
            <X className="h-3 w-3" />
            <span className="hidden sm:inline ml-1">Limpiar</span>
          </Button>
        )}
      </div>

      {/* Contenido del carrito - Deslizable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasItems ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-6 sm:py-12 lg:py-16">
            <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 lg:p-6 bg-gray-50 rounded-full">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-600 mb-2">
              Tu carrito está vacío
            </h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed px-2">
              Agrega productos o combos para comenzar tu venta
            </p>
          </div>
        ) : (
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
                {items.map((item, index) => (
                  <TableRow key={`${item.id}-${index}`}>
                    <TableCell className="font-medium py-1 sm:py-2">
                      <div className="text-xs sm:text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(item.sale_price)} c/u
                        {item.discount_type && (item.discount_value ?? 0) > 0 && (
                          <span className="ml-1 sm:ml-2 text-amber-700 text-xs">
                            Desc: {item.discount_type === 'percent' 
                              ? `${item.discount_value}%` 
                              : `${formatCurrency(Number(item.discount_value))}`}
                          </span>
                        )}
                        {item.is_from_combo && (
                          <div className="text-xs text-blue-600 mt-1">
                            <Package className="h-3 w-3 inline mr-1" />
                            De combo: {item.combo_name}
                            {item.combo_discount_applied && item.combo_discount_applied > 0 && (
                              <span className="ml-1 text-green-600">
                                (Descuento: {formatCurrency(item.combo_discount_applied)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 sm:py-2">
                      <div className="flex items-center justify-center">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" 
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
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
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Resumen y botón - Fijo */}
      <div className="border-t p-2 sm:p-4 lg:p-6 flex-shrink-0">
        <div className="space-y-1 sm:space-y-2 lg:space-y-3">
          <div className="flex justify-between py-1">
            <span className="text-xs sm:text-sm text-gray-600">Subtotal (sin IVA)</span>
            <span className="text-xs sm:text-sm font-medium">{formatCurrency(subtotalNet)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-xs sm:text-sm text-gray-600">Impuestos (IVA)</span>
            <span className="text-xs sm:text-sm font-medium">{formatCurrency(totalIva)}</span>
          </div>
          <div className="flex justify-between py-1 text-xs sm:text-sm text-muted-foreground">
            <span>Descuentos</span>
            <span>- {formatCurrency(totalItemDiscount + globalDiscountAmount)}</span>
          </div>
          <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
            <div className="flex justify-between text-sm sm:text-base lg:text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Button 
          className="mt-3 sm:mt-4 lg:mt-6 w-full cursor-pointer" 
          size="sm" 
          disabled={!hasItems} 
          onClick={onCompleteSale}
          aria-label="Completar venta"
        >
          Completar Venta
        </Button>
      </div>
    </div>
  );
};
