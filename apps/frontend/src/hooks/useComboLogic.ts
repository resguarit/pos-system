import { useState, useCallback } from 'react';
import { sileo } from "sileo"
import { useCombosInPOS } from '@/hooks/useCombosInPOS';
import type { Combo } from '@/types/combo';

interface UseComboLogicProps {
  branchId: number | null;
  addQtyPerClick: number;
  onComboAdded: (combo: Combo, quantity: number) => Promise<void>;
}

/**
 * Hook personalizado para manejar la lógica de combos
 * Aplica principios SOLID:
 * - SRP: Solo maneja operaciones de combos
 * - OCP: Extensible para nuevas funcionalidades
 * - DIP: Depende de abstracciones (callbacks)
 */
export const useComboLogic = ({
  branchId,
  addQtyPerClick,
  onComboAdded
}: UseComboLogicProps) => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingCombo, setAddingCombo] = useState<number | null>(null);

  const { fetchAvailableCombos, checkComboStock } = useCombosInPOS();

  /**
   * Carga los combos disponibles para la sucursal
   * Aplica principio DRY - Evita duplicación de lógica de carga
   */
  const loadCombos = useCallback(async () => {
    if (!branchId) return;

    setLoading(true);
    try {
      const combosData = await fetchAvailableCombos(branchId);
      setCombos(combosData);
    } catch (error) {
      console.error("Error loading combos:", error);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, fetchAvailableCombos]);

  /**
   * Valida la disponibilidad del combo
   * Aplica principio SRP - Solo maneja validación de stock
   */
  const validateComboAvailability = useCallback(async (
    combo: Combo,
    quantity: number
  ) => {
    if (!branchId) {
      throw new Error("Debe seleccionar una sucursal");
    }

    const availability = await checkComboStock(combo.id, branchId, quantity);

    if (!availability.is_available) {
      const limitingProduct = availability.limiting_products?.[0];
      if (limitingProduct?.reason === 'No hay stock configurado en esta sucursal') {
        const productName = limitingProduct.product?.description || 'producto';
        throw new Error(`${productName} no tiene stock configurado en esta sucursal`);
      }
    }

    return availability;
  }, [branchId, checkComboStock]);

  /**
   * Muestra advertencias de stock si es necesario
   * Aplica principio SRP - Solo maneja notificaciones de stock
   */
  const showStockWarnings = useCallback((availability: any) => {
    if (!availability.limiting_products || availability.limiting_products.length === 0) {
      return;
    }

    const limitingProduct = availability.limiting_products[0];
    const productName = limitingProduct.product?.description || 'producto';

    if (limitingProduct.reason === 'Stock negativo') {
      sileo.warning({ title: `⚠️ Stock negativo en ${productName} (${limitingProduct.available} unidades). La venta continuará.` });
    } else if (limitingProduct.reason === 'Stock bajo') {
      sileo.warning({ title: `⚠️ Stock bajo en ${productName} (${limitingProduct.available} unidades). Considera reponer.` });
    }
  }, []);

  /**
   * Agrega un combo al carrito con validaciones
   * Aplica principio DRY - Evita duplicación de lógica de agregado
   */
  const handleAddComboToCart = useCallback(async (combo: Combo, qty?: number) => {
    try {
      setAddingCombo(combo.id);
      const quantityToAdd = Math.max(1, Number(qty ?? addQtyPerClick) || 1);

      // Validar disponibilidad
      const availability = await validateComboAvailability(combo, quantityToAdd);

      // Mostrar advertencias de stock
      showStockWarnings(availability);

      // Delegar al componente padre
      await onComboAdded(combo, quantityToAdd);
    } catch (error) {
      sileo.error({ title: (error as Error).message || "Error al agregar combo al carrito" });
    } finally {
      setAddingCombo(null);
    }
  }, [addQtyPerClick, onComboAdded, validateComboAvailability, showStockWarnings]);

  return {
    combos,
    loading,
    addingCombo,
    loadCombos,
    handleAddComboToCart
  };
};
