export interface PriceUpdateResult {
  success: boolean;
  updatedCount: number;
  failed_updates?: Array<{ product_id: number; error: string }>;
  message: string;
}

export interface UpdateStrategy {
  calculateNewPrice(currentPrice: number): number;
  validate(): { isValid: boolean; error?: string };
}

/**
 * Redondea un precio de manera inteligente según su magnitud
 * Misma lógica que en crear/editar productos
 */
const roundPrice = (price: number): number => {
  if (price < 1000) {
    return Math.round(price / 10) * 10;
  }
  return Math.round(price / 100) * 100;
};

export class PercentageUpdateStrategy implements UpdateStrategy {
  constructor(private percentage: number) {}

  calculateNewPrice(currentPrice: number): number {
    const newPrice = currentPrice * (1 + this.percentage / 100);
    return roundPrice(newPrice);
  }

  validate(): { isValid: boolean; error?: string } {
    if (this.percentage < -100 || this.percentage > 1000) {
      return { 
        isValid: false, 
        error: 'El porcentaje debe estar entre -100% y 1000%' 
      };
    }
    return { isValid: true };
  }
}

export class FixedUpdateStrategy implements UpdateStrategy {
  constructor(private fixedValue: number) {}

  calculateNewPrice(currentPrice: number): number {
    const newPrice = currentPrice + this.fixedValue;
    return roundPrice(newPrice);
  }

  validate(): { isValid: boolean; error?: string } {
    if (isNaN(this.fixedValue)) {
      return { 
        isValid: false, 
        error: 'El valor debe ser un número válido' 
      };
    }
    return { isValid: true };
  }
}

export class PriceUpdateContext {
  private strategy: UpdateStrategy;

  constructor(strategy: UpdateStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: UpdateStrategy) {
    this.strategy = strategy;
  }

  validate(): { isValid: boolean; error?: string } {
    return this.strategy.validate();
  }

  calculateNewPrice(currentPrice: number): number {
    return this.strategy.calculateNewPrice(currentPrice);
  }

  async applyBulkUpdate(updates: Array<{ id: number; currentPrice: number }>): Promise<PriceUpdateResult> {
    const validation = this.validate();
    if (!validation.isValid) {
      return {
        success: false,
        updatedCount: 0,
        message: validation.error || 'Error de validación',
      };
    }

    try {
      const updatedPrices = updates.map(({ id, currentPrice }) => {
        try {
          const newPrice = this.calculateNewPrice(currentPrice);
          return { id, newPrice, success: true };
        } catch (error) {
          return { 
            id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
          };
        }
      });

      const successfulUpdates = updatedPrices.filter(update => update.success);
      const failedUpdates = updatedPrices
        .filter(update => !update.success)
        .map(update => ({
          product_id: update.id,
          error: (update as any).error || 'Error desconocido'
        }));

      return {
        success: true,
        updatedCount: successfulUpdates.length,
        failed_updates: failedUpdates.length > 0 ? failedUpdates : undefined,
        message: `Se actualizaron ${successfulUpdates.length} productos exitosamente` +
                 (failedUpdates.length > 0 ? `, ${failedUpdates.length} fallaron` : '')
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        message: error instanceof Error ? error.message : 'Error al actualizar precios',
      };
    }
  }
}
