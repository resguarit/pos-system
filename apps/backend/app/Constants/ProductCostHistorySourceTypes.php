<?php

namespace App\Constants;

/**
 * Constantes para los tipos de origen de cambios de costo
 */
class ProductCostHistorySourceTypes
{
    public const PURCHASE_ORDER = 'purchase_order';
    public const MANUAL = 'manual';
    public const BULK_UPDATE = 'bulk_update';
    public const BULK_UPDATE_BY_CATEGORY = 'bulk_update_by_category';
    public const BULK_UPDATE_BY_SUPPLIER = 'bulk_update_by_supplier';

    /**
     * Obtiene todos los tipos de origen válidos
     *
     * @return array
     */
    public static function all(): array
    {
        return [
            self::PURCHASE_ORDER,
            self::MANUAL,
            self::BULK_UPDATE,
            self::BULK_UPDATE_BY_CATEGORY,
            self::BULK_UPDATE_BY_SUPPLIER,
        ];
    }

    /**
     * Verifica si un tipo de origen es válido
     *
     * @param string|null $sourceType
     * @return bool
     */
    public static function isValid(?string $sourceType): bool
    {
        if ($sourceType === null) {
            return true; // null es válido (opcional)
        }

        return in_array($sourceType, self::all(), true);
    }

    /**
     * Obtiene la etiqueta legible para un tipo de origen
     *
     * @param string|null $sourceType
     * @return string
     */
    public static function getLabel(?string $sourceType): string
    {
        $labels = [
            self::PURCHASE_ORDER => 'Orden de Compra',
            self::MANUAL => 'Actualización Manual',
            self::BULK_UPDATE => 'Actualización Masiva',
            self::BULK_UPDATE_BY_CATEGORY => 'Actualización por Categoría',
            self::BULK_UPDATE_BY_SUPPLIER => 'Actualización por Proveedor',
        ];

        return $labels[$sourceType] ?? 'Desconocido';
    }
}



