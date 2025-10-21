import { ShoppingCart } from "lucide-react";

/**
 * Componente responsable únicamente del estado vacío del carrito
 * Principio de Responsabilidad Única (SRP)
 */
export const EmptyCartState = () => {
  return (
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
  );
};
