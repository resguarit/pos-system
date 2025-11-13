<?php

namespace App\Services;

use App\Interfaces\ProductCostHistoryServiceInterface;
use App\Models\ProductCostHistory;
use App\Models\Product;
use App\Constants\ProductCostHistorySourceTypes;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProductCostHistoryService implements ProductCostHistoryServiceInterface
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
     * @throws InvalidArgumentException Si los datos son inválidos
     */
    public function recordCostChange(
        Product $product,
        float $newCost,
        ?string $sourceType = null,
        ?int $sourceId = null,
        ?string $notes = null,
        ?float $previousCost = null
    ): ProductCostHistory {
        // Validaciones
        $this->validateCostChange($product, $newCost, $sourceType, $sourceId);

        // Si no se proporciona el costo anterior, obtenerlo del producto
        if ($previousCost === null) {
            $previousCost = $product->unit_price;
        }

        // No registrar si el costo no cambió (con tolerancia para errores de punto flotante)
        $tolerance = 0.01;
        if ($previousCost !== null && abs((float)$previousCost - (float)$newCost) < $tolerance) {
            Log::debug("Producto ID {$product->id} - costo no cambió significativamente ({$previousCost} -> {$newCost}), no se registra en historial");
            // No lanzar excepción para no interrumpir el flujo, pero loguear el evento
            // Retornar el último registro si existe, o null
            $lastHistory = $this->getLastCostHistory($product->id);
            if ($lastHistory) {
                return $lastHistory;
            }
            // Si no hay historial previo, crear uno para mantener trazabilidad
            Log::info("No hay historial previo, creando registro inicial para producto ID {$product->id}");
        }

        // Validar que el nuevo costo sea positivo
        if ($newCost < 0) {
            throw new InvalidArgumentException("El costo no puede ser negativo.");
        }

        $currency = $product->currency ?? 'ARS';
        $userId = Auth::id();

        try {
            return DB::transaction(function () use (
                $product,
                $previousCost,
                $newCost,
                $currency,
                $sourceType,
                $sourceId,
                $notes,
                $userId
            ) {
                $history = ProductCostHistory::create([
                    'product_id' => $product->id,
                    'previous_cost' => $previousCost,
                    'new_cost' => $newCost,
                    'currency' => $currency,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'notes' => $this->sanitizeNotes($notes),
                    'user_id' => $userId,
                ]);

                Log::info("Historial de costo registrado para producto ID {$product->id}: {$previousCost} -> {$newCost} ({$currency})", [
                    'product_id' => $product->id,
                    'previous_cost' => $previousCost,
                    'new_cost' => $newCost,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                ]);

                return $history;
            });
        } catch (\Exception $e) {
            Log::error("Error al registrar historial de costo para producto ID {$product->id}: " . $e->getMessage(), [
                'product_id' => $product->id,
                'new_cost' => $newCost,
                'source_type' => $sourceType,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Valida los datos antes de registrar un cambio de costo
     *
     * @param Product $product
     * @param float $newCost
     * @param string|null $sourceType
     * @param int|null $sourceId
     * @return void
     * @throws InvalidArgumentException
     */
    private function validateCostChange(
        Product $product,
        float $newCost,
        ?string $sourceType,
        ?int $sourceId
    ): void {
        if (!$product->exists) {
            throw new InvalidArgumentException("El producto no existe.");
        }

        if (!ProductCostHistorySourceTypes::isValid($sourceType)) {
            throw new InvalidArgumentException("Tipo de origen inválido: {$sourceType}");
        }

        if ($sourceId !== null && $sourceId <= 0) {
            throw new InvalidArgumentException("El ID de origen debe ser un número positivo.");
        }
    }

    /**
     * Sanitiza las notas antes de guardarlas
     *
     * @param string|null $notes
     * @return string|null
     */
    private function sanitizeNotes(?string $notes): ?string
    {
        if ($notes === null) {
            return null;
        }

        // Limpiar y truncar si es muy largo
        $notes = trim($notes);
        $maxLength = 1000; // Límite razonable para notas

        if (strlen($notes) > $maxLength) {
            $notes = substr($notes, 0, $maxLength) . '...';
            Log::warning("Notas truncadas en historial de costo (máximo {$maxLength} caracteres)");
        }

        return $notes;
    }

    /**
     * Obtiene el historial de costos de un producto
     *
     * @param int $productId
     * @param int|null $limit
     * @return Collection
     * @throws InvalidArgumentException Si el ID del producto es inválido
     */
    public function getProductCostHistory(int $productId, ?int $limit = null): Collection
    {
        if ($productId <= 0) {
            throw new InvalidArgumentException("El ID del producto debe ser un número positivo.");
        }

        if ($limit !== null && ($limit < 1 || $limit > 1000)) {
            throw new InvalidArgumentException("El límite debe estar entre 1 y 1000.");
        }

        $query = ProductCostHistory::where('product_id', $productId)
            ->with(['user' => function ($query) {
                $query->with('person');
            }]) // Eager load para evitar N+1, maneja usuarios nulos
            ->orderBy('created_at', 'desc');

        if ($limit !== null) {
            $query->limit($limit);
        }

        return $query->get();
    }

    /**
     * Obtiene el historial de costos de múltiples productos
     *
     * @param array $productIds
     * @param int|null $limit
     * @return Collection
     * @throws InvalidArgumentException Si los IDs son inválidos
     */
    public function getMultipleProductsCostHistory(array $productIds, ?int $limit = null): Collection
    {
        if (empty($productIds)) {
            throw new InvalidArgumentException("Debe proporcionar al menos un ID de producto.");
        }

        // Validar que todos los IDs sean enteros positivos
        $validIds = array_filter($productIds, function ($id) {
            return is_int($id) && $id > 0;
        });

        if (count($validIds) !== count($productIds)) {
            throw new InvalidArgumentException("Todos los IDs de productos deben ser enteros positivos.");
        }

        if (count($productIds) > 100) {
            throw new InvalidArgumentException("No se pueden consultar más de 100 productos a la vez.");
        }

        if ($limit !== null && ($limit < 1 || $limit > 1000)) {
            throw new InvalidArgumentException("El límite debe estar entre 1 y 1000.");
        }

        $query = ProductCostHistory::whereIn('product_id', $productIds)
            ->with([
                'product:id,description,code',
                'user' => function ($query) {
                    $query->with('person');
                }
            ]) // Solo cargar campos necesarios, maneja usuarios nulos
            ->orderBy('created_at', 'desc');

        if ($limit !== null) {
            $query->limit($limit);
        }

        return $query->get();
    }

    /**
     * Obtiene el último costo registrado para un producto
     *
     * @param int $productId
     * @return ProductCostHistory|null
     * @throws InvalidArgumentException Si el ID del producto es inválido
     */
    public function getLastCostHistory(int $productId): ?ProductCostHistory
    {
        if ($productId <= 0) {
            throw new InvalidArgumentException("El ID del producto debe ser un número positivo.");
        }

        return ProductCostHistory::where('product_id', $productId)
            ->with(['user' => function ($query) {
                $query->with('person');
            }]) // Eager load para evitar N+1, maneja usuarios nulos
            ->orderBy('created_at', 'desc')
            ->first();
    }
}

