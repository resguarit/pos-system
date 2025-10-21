import { Button } from "@/components/ui/button";

interface CartSummaryProps {
  subtotalNet: number;
  totalIva: number;
  totalItemDiscount: number;
  globalDiscountAmount: number;
  total: number;
  formatCurrency: (amount: number) => string;
  onCompleteSale: () => void;
  isDisabled?: boolean;
}

/**
 * Componente responsable únicamente del resumen financiero del carrito
 * Principio de Responsabilidad Única (SRP)
 */
export const CartSummary = ({
  subtotalNet,
  totalIva,
  totalItemDiscount,
  globalDiscountAmount,
  total,
  formatCurrency,
  onCompleteSale,
  isDisabled = false
}: CartSummaryProps) => {
  const totalDiscounts = totalItemDiscount + globalDiscountAmount;

  return (
    <div className="border-t p-2 sm:p-4 lg:p-6 flex-shrink-0">
      <div className="space-y-1 sm:space-y-2 lg:space-y-3">
        <div className="flex justify-between py-1">
          <span className="text-xs sm:text-sm text-gray-600">Subtotal (sin IVA)</span>
          <span className="text-xs sm:text-sm font-medium">
            {formatCurrency(subtotalNet)}
          </span>
        </div>
        
        <div className="flex justify-between py-1">
          <span className="text-xs sm:text-sm text-gray-600">Impuestos (IVA)</span>
          <span className="text-xs sm:text-sm font-medium">
            {formatCurrency(totalIva)}
          </span>
        </div>
        
        <div className="flex justify-between py-1 text-xs sm:text-sm text-muted-foreground">
          <span>Descuentos</span>
          <span>- {formatCurrency(totalDiscounts)}</span>
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
        disabled={isDisabled} 
        onClick={onCompleteSale}
        aria-label="Completar venta"
      >
        Completar Venta
      </Button>
    </div>
  );
};
