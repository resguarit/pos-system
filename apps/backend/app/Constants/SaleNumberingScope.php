<?php

declare(strict_types=1);

namespace App\Constants;

/**
 * Alcance de numeración de comprobantes (sales_header.numbering_scope).
 *
 * - Ventas (fiscales y no fiscales) comparten una secuencia contigua por sucursal (sale).
 * - Presupuestos tienen secuencia propia por sucursal (presupuesto).
 *
 * Evita magic strings y centraliza validación.
 */
final class SaleNumberingScope
{
    /** Secuencia única de ventas (Factura A/B/C/X, etc.) por sucursal */
    public const SALE = 'sale';

    /** Secuencia propia de presupuestos por sucursal */
    public const PRESUPUESTO = 'presupuesto';

    /**
     * Valores permitidos para validación y listados.
     *
     * @return array<string>
     */
    public static function allowedValues(): array
    {
        return [self::SALE, self::PRESUPUESTO];
    }

    /**
     * Indica si el valor es un alcance válido.
     * Acepta los valores canónicos (sale, presupuesto) y legacy sale_{receipt_type_id}.
     */
    public static function isValid(string $value): bool
    {
        if (in_array($value, self::allowedValues(), true)) {
            return true;
        }
        // Legacy: migraciones que usaron numbering_scope = 'sale_' . receipt_type_id
        return preg_match('/^sale_\d+$/', $value) === 1;
    }

    /**
     * Etiqueta legible para UI o reportes.
     */
    public static function label(string $scope): string
    {
        return match ($scope) {
            self::SALE => 'Venta',
            self::PRESUPUESTO => 'Presupuesto',
            default => $scope,
        };
    }
}
