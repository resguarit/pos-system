<?php

namespace App\Interfaces;

use App\Models\Product;
use App\Models\ProductCostHistory;
use Illuminate\Database\Eloquent\Collection;

interface ProductCostHistoryServiceInterface
{
    /**
     * Registra un cambio de costo en el historial
     *
     * @param Product $product El producto cuyo costo cambió
     * @param float $newCost El nuevo costo
     * @param string|null $sourceType Tipo de fuente del cambio
     * @param int|null $sourceId ID de la fuente
     * @param string|null $notes Notas adicionales
     * @param float|null $previousCost Costo anterior
     * @return ProductCostHistory
     * @throws \InvalidArgumentException Si los datos son inválidos
     */
    public function recordCostChange(
        Product $product,
        float $newCost,
        ?string $sourceType = null,
        ?int $sourceId = null,
        ?string $notes = null,
        ?float $previousCost = null
    ): ProductCostHistory;

    /**
     * Obtiene el historial de costos de un producto
     *
     * @param int $productId
     * @param int|null $limit
     * @return Collection
     */
    public function getProductCostHistory(int $productId, ?int $limit = null): Collection;

    /**
     * Obtiene el historial de costos de múltiples productos
     *
     * @param array $productIds
     * @param int|null $limit
     * @return Collection
     */
    public function getMultipleProductsCostHistory(array $productIds, ?int $limit = null): Collection;

    /**
     * Obtiene el último costo registrado para un producto
     *
     * @param int $productId
     * @return ProductCostHistory|null
     */
    public function getLastCostHistory(int $productId): ?ProductCostHistory;
}



