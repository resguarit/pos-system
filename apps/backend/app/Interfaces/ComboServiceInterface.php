<?php

declare(strict_types=1);

namespace App\Interfaces;

use App\Models\Combo;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface ComboServiceInterface
{
    /**
     * Obtener todos los combos con filtros opcionales
     */
    public function getAll(array $filters = []): Collection;

    /**
     * Obtener combos disponibles en una sucursal específica
     */
    public function getAvailableInBranch(int $branchId): Collection;

    /**
     * Obtener un combo por ID con sus relaciones
     */
    public function getById(int $id): ?Combo;

    /**
     * Crear un nuevo combo
     */
    public function create(array $data): Combo;

    /**
     * Actualizar un combo existente
     */
    public function update(int $id, array $data): Combo;

    /**
     * Eliminar un combo (soft delete)
     */
    public function delete(int $id): bool;

    /**
     * Calcular precio dinámico de un combo
     */
    public function calculatePrice(int $comboId): array;

    /**
     * Verificar disponibilidad de combo en sucursal
     */
    public function checkAvailability(int $comboId, int $branchId, int $quantity = 1): array;

    /**
     * Descontar stock de productos componentes al vender un combo
     */
    public function deductComboStock(int $comboId, int $branchId, int $quantity): void;

    /**
     * Restaurar stock de productos componentes al anular una venta con combo
     */
    public function restoreComboStock(int $comboId, int $branchId, int $quantity): void;

    /**
     * Validar datos de combo antes de crear/actualizar
     */
    public function validateComboData(array $data): array;

    /**
     * Obtener estadísticas de combos
     */
    public function getStatistics(): array;
}

