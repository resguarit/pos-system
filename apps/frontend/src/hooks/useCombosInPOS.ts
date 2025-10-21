import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getAllCombos, calculateComboPrice, checkComboAvailability } from '@/lib/api/comboService';
import type { Combo, ComboPriceCalculation, ComboAvailability } from '@/types/combo';

/**
 * Hook para manejar combos en el POS
 * Proporciona funciones para obtener, calcular precios y verificar disponibilidad de combos
 */
export const useCombosInPOS = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Obtener combos disponibles en una sucursal
   * @param branchId - ID de la sucursal (actualmente no se usa pero se mantiene para futuras implementaciones)
   * @returns Promise con array de combos activos
   */
  const fetchAvailableCombos = useCallback(async (_branchId: number): Promise<Combo[]> => {
    try {
      setLoading(true);
      const combos = await getAllCombos();
      // Filtrar solo combos activos
      // TODO: Implementar filtrado por sucursal cuando el backend lo soporte
      return combos.filter(combo => combo.is_active === true);
    } catch (error) {
      console.error('Error fetching available combos:', error);
      toast.error('Error al cargar combos disponibles');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener detalles de precio de un combo
   * @param comboId - ID del combo
   * @returns Promise con detalles de precio del combo
   * @throws Error si no se puede obtener el precio
   */
  const getComboPriceDetails = useCallback(async (comboId: number): Promise<ComboPriceCalculation> => {
    try {
      const priceDetails = await calculateComboPrice(comboId);
      return priceDetails;
    } catch (error) {
      console.error('Error getting combo price details:', error);
      toast.error('Error al obtener precio del combo');
      throw error;
    }
  }, []);

  /**
   * Verificar disponibilidad de stock de un combo
   * @param comboId - ID del combo
   * @param branchId - ID de la sucursal
   * @param quantity - Cantidad solicitada
   * @returns Promise con información de disponibilidad
   */
  const checkComboStock = useCallback(async (
    comboId: number, 
    branchId: number, 
    quantity: number
  ): Promise<ComboAvailability> => {
    try {
      const availability = await checkComboAvailability(comboId, branchId, quantity);
      return availability;
    } catch (error) {
      console.error('Error checking combo stock:', error);
      toast.error('Error al verificar disponibilidad del combo');
      
      // Retornar estado de error consistente con el tipo ComboAvailability
      return {
        is_available: false,
        max_quantity: 0,
        limiting_products: []
      };
    }
  }, []);

  return {
    fetchAvailableCombos,
    getComboPriceDetails,
    checkComboStock,
    loading
  };
};