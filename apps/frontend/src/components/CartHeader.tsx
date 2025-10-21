import { ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CartHeaderProps {
  itemCount: number;
  onClearCart: () => void;
}

/**
 * Componente responsable únicamente del header del carrito
 * Principio de Responsabilidad Única (SRP)
 */
export const CartHeader = ({ itemCount, onClearCart }: CartHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b p-2 sm:p-3 lg:p-4 flex-shrink-0">
      <div className="flex items-center flex-1 min-w-0">
        <ShoppingCart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
        <h2 className="text-xs sm:text-sm lg:text-base font-semibold">Carrito</h2>
        <Badge variant="secondary" className="ml-1 sm:ml-2 flex-shrink-0 text-xs">
          {itemCount}
        </Badge>
        {itemCount > 0 && (
          <span className="ml-1 sm:ml-2 text-xs text-muted-foreground hidden lg:inline">
            (guardado automáticamente)
          </span>
        )}
      </div>
      {itemCount > 0 && (
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
  );
};
