import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Info, Zap } from "lucide-react";
import { ComboDetailsDialog } from "@/components/ComboDetailsDialog";
import { useCombosInPOS } from "@/hooks/useCombosInPOS";
import { toast } from "sonner";
import type { Combo } from "@/types/combo";

interface ComboSectionProps {
  branchId: number | null;
  addQtyPerClick: number;
  formatCurrency: (amount: number) => string;
  onComboAdded: (combo: Combo, quantity: number) => Promise<void>;
}

export function ComboSection({ 
  branchId, 
  addQtyPerClick, 
  formatCurrency, 
  onComboAdded 
}: ComboSectionProps) {
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [showComboDetails, setShowComboDetails] = useState(false);
  const [addingCombo, setAddingCombo] = useState<number | null>(null);
  
  const { 
    fetchAvailableCombos, 
    checkComboStock, 
    loading 
  } = useCombosInPOS();

  const [combos, setCombos] = useState<Combo[]>([]);

  // Cargar combos cuando cambie la sucursal
  useEffect(() => {
    const loadCombos = async () => {
      if (!branchId) return;
      
      try {
        const availableCombos = await fetchAvailableCombos(branchId);
        setCombos(availableCombos);
      } catch (error) {
        console.error('Error loading combos:', error);
        toast.error('Error al cargar combos');
      }
    };

    loadCombos();
  }, [branchId, fetchAvailableCombos]);

  const showComboDetailsDialog = useCallback((combo: Combo) => {
    setSelectedCombo(combo);
    setShowComboDetails(true);
  }, []);

  /**
   * Maneja la adición de un combo al carrito con validación de stock
   * Aplica principio SRP - Solo maneja la lógica de agregar combo
   */
  const handleAddComboToCart = useCallback(async (combo: Combo, qty?: number) => {
    try {
      setAddingCombo(combo.id);
      const quantityToAdd = Math.max(1, Number(qty ?? addQtyPerClick) || 1);
      
      if (!branchId) {
        throw new Error("Debe seleccionar una sucursal");
      }

      // Verificar disponibilidad
      const availability = await checkComboStock(combo.id, branchId, quantityToAdd);
      
      // Solo bloquear si no hay stock configurado en la sucursal
      if (!availability.is_available) {
        const limitingProduct = availability.limiting_products?.[0];
        if (limitingProduct?.reason === 'No hay stock configurado en esta sucursal') {
          const productName = limitingProduct.product?.description || 'producto';
          throw new Error(`${productName} no tiene stock configurado en esta sucursal`);
        }
      }
      
      // Mostrar advertencia si hay stock bajo o negativo, pero permitir la venta
      if (availability.limiting_products && availability.limiting_products.length > 0) {
        const limitingProduct = availability.limiting_products[0];
        const productName = limitingProduct.product?.description || 'producto';
        
        if (limitingProduct.reason === 'Stock negativo') {
          toast.warning(`⚠️ Stock negativo en ${productName} (${limitingProduct.available} unidades). La venta continuará.`);
        } else if (limitingProduct.reason === 'Stock bajo') {
          toast.warning(`⚠️ Stock bajo en ${productName} (${limitingProduct.available} unidades). Considera reponer.`);
        }
      }

      // Delegar al componente padre
      await onComboAdded(combo, quantityToAdd);
    } catch (error) {
      console.error("Error adding combo to cart:", error);
      toast.error((error as Error).message || "Error al agregar combo al carrito");
    } finally {
      setAddingCombo(null);
    }
  }, [branchId, addQtyPerClick, checkComboStock, onComboAdded]);

  // Early returns para estados específicos
  if (loading) {
    return <LoadingState />;
  }

  if (combos.length === 0) {
    return null;
  }

  return (
    <>
      <ComboSectionHeader />
      
      <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {combos.map((combo) => (
          <ComboCard
            key={`combo-${combo.id}`}
            combo={combo}
            formatCurrency={formatCurrency}
            addQtyPerClick={addQtyPerClick}
            addingCombo={addingCombo}
            onAddToCart={handleAddComboToCart}
            onShowDetails={showComboDetailsDialog}
          />
        ))}
      </div>

      {/* Diálogo de detalles del combo */}
      <ComboDetailsDialog
        open={showComboDetails}
        onOpenChange={setShowComboDetails}
        combo={selectedCombo}
        onAddToCart={(combo) => handleAddComboToCart(combo, addQtyPerClick)}
        formatCurrency={formatCurrency}
      />
    </>
  );
}

/**
 * Componente para mostrar el estado de carga
 * Aplica principio SRP - Solo maneja el estado de carga
 * Aplica principio DRY - Reutilizable para cualquier estado de carga
 */
const LoadingState: React.FC = () => (
  <div className="col-span-full flex items-center justify-center py-8">
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      Cargando combos...
    </div>
  </div>
);

/**
 * Componente para el header de la sección de combos
 * Aplica principio SRP - Solo maneja el header
 * Aplica principio DRY - Reutilizable para cualquier sección
 */
const ComboSectionHeader: React.FC = () => (
  <div className="col-span-full flex items-center gap-2 mb-6 mt-8">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Package className="h-5 w-5 text-gray-700" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Combos Disponibles
        </h3>
        <p className="text-xs text-muted-foreground">
          Ahorra más con nuestros combos especiales
        </p>
      </div>
    </div>
  </div>
);

/**
 * Utilidad para determinar el tipo de badge según el descuento
 * Aplica principio DRY - Evita duplicación de lógica
 * Aplica principio SRP - Solo determina el tipo de badge
 */
const getComboBadgeVariant = (combo: Combo): "destructive" | "default" | "secondary" => {
  // Early return para casos específicos
  if (combo.discount_type === 'percentage' && combo.discount_value >= 20) {
    return 'destructive';
  }
  
  if (combo.discount_type === 'percentage' && combo.discount_value >= 10) {
    return 'default';
  }
  
  return 'secondary';
};

/**
 * Componente para una tarjeta de combo individual
 * Aplica principio SRP - Solo maneja una tarjeta de combo
 */
interface ComboCardProps {
  combo: Combo;
  formatCurrency: (amount: number) => string;
  addQtyPerClick: number;
  addingCombo: number | null;
  onAddToCart: (combo: Combo, qty?: number) => Promise<void>;
  onShowDetails: (combo: Combo) => void;
}

/**
 * Componente para una tarjeta de combo individual
 * Aplica principio SRP - Solo maneja una tarjeta de combo
 * Aplica principio DRY - Reutilizable para cualquier combo
 */
interface ComboCardProps {
  combo: Combo;
  formatCurrency: (amount: number) => string;
  addQtyPerClick: number;
  addingCombo: number | null;
  onAddToCart: (combo: Combo, qty?: number) => Promise<void>;
  onShowDetails: (combo: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ 
  combo, 
  formatCurrency, 
  addQtyPerClick, 
  addingCombo, 
  onAddToCart, 
  onShowDetails 
}) => {
  // Event handlers con early returns
  const handleCardClick = useCallback(() => {
    onAddToCart(combo, addQtyPerClick);
  }, [combo, addQtyPerClick, onAddToCart]);

  const handleDetailsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetails(combo);
  }, [combo, onShowDetails]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(combo, addQtyPerClick);
  }, [combo, addQtyPerClick, onAddToCart]);

  // Early return para estado de carga
  const isLoading = addingCombo === combo.id;

  return (
    <Card 
      className="group relative overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md bg-white flex flex-col h-[160px] sm:h-[180px]"
      onClick={handleCardClick}
    >
      <ComboDiscountBadge combo={combo} formatCurrency={formatCurrency} />
      
      <CardContent className="flex-1 px-2 pt-10 pb-2">
        <ComboCardContent combo={combo} />
      </CardContent>

      <CardFooter className="p-2 pt-0 mt-auto">
        <ComboCardActions 
          combo={combo}
          isLoading={isLoading}
          addQtyPerClick={addQtyPerClick}
          onDetailsClick={handleDetailsClick}
          onAddClick={handleAddClick}
        />
      </CardFooter>

      {/* Efecto de hover sutil */}
      <div className="absolute inset-0 bg-gray-50/0 group-hover:bg-gray-50/30 transition-all duration-300 pointer-events-none"></div>
    </Card>
  );
};

/**
 * Componente para el badge de descuento del combo
 * Aplica principio SRP - Solo maneja el badge de descuento
 */
interface ComboDiscountBadgeProps {
  combo: Combo;
  formatCurrency: (amount: number) => string;
}

const ComboDiscountBadge: React.FC<ComboDiscountBadgeProps> = ({ combo, formatCurrency }) => (
  <div className="absolute top-3 right-3 z-10">
    <Badge 
      variant={getComboBadgeVariant(combo)}
      className="shadow-md font-semibold"
    >
      {combo.discount_type === 'percentage' 
        ? `${combo.discount_value}% OFF` 
        : `${formatCurrency(combo.discount_value)} OFF`
      }
    </Badge>  
  </div>
);

/**
 * Componente para el contenido de la tarjeta del combo
 * Aplica principio SRP - Solo maneja el contenido de la tarjeta
 */
interface ComboCardContentProps {
  combo: Combo;
}

const ComboCardContent: React.FC<ComboCardContentProps> = ({ combo }) => (
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-900 transition-colors truncate">
      {combo.name}
    </h3>
    {combo.description && (
      <p className="text-[11px] text-gray-600 truncate">
        {combo.description}
      </p>
    )}
    
    {/* Indicador de productos incluidos */}
    <div className="flex items-center gap-1 mt-0.5">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-xs text-green-600 font-medium">
        {combo.combo_items?.length || 0} productos incluidos
      </span>
    </div>
  </div>
);

/**
 * Componente para las acciones de la tarjeta del combo
 * Aplica principio SRP - Solo maneja las acciones de la tarjeta
 */
interface ComboCardActionsProps {
  combo: Combo;
  isLoading: boolean;
  addQtyPerClick: number;
  onDetailsClick: (e: React.MouseEvent) => void;
  onAddClick: (e: React.MouseEvent) => void;
}

const ComboCardActions: React.FC<ComboCardActionsProps> = ({ 
  combo, 
  isLoading, 
  addQtyPerClick, 
  onDetailsClick, 
  onAddClick 
}) => (
  <div className="flex flex-col gap-1 w-full">
    <Button
      variant="outline"
      size="sm"
      className="w-full h-8 text-xs bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
      onClick={onDetailsClick}
      aria-label={`Ver detalles de ${combo.name}`}
    >
      <Info className="h-3 w-3 mr-1" />
      Detalles
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full h-8 bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 font-semibold" 
      onClick={onAddClick}
      disabled={isLoading}
      aria-label={`Agregar ${combo.name} al carrito`}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></div>
      ) : (
        <>
          <Zap className="h-3 w-3 mr-1" />
          Agregar x{Math.max(1, addQtyPerClick)}
        </>
      )}
    </Button>
  </div>
);
