<?php

declare(strict_types=1);

namespace App\Constants;

/**
 * Constantes para tipos de movimiento de cuentas corrientes
 * 
 * Centraliza valores mágicos y facilita el mantenimiento
 */
class CurrentAccountMovementTypes
{
    public const CREDIT_USAGE = 'Uso de crédito a favor';
    public const SALE = 'Venta';
    public const CASH_PAYMENT = 'Pago en efectivo';
    public const CARD_PAYMENT = 'Pago con tarjeta';
    public const TRANSFER_PAYMENT = 'Pago con transferencia';
    public const ACCOUNT_PAYMENT = 'Pago de cuenta corriente';
    
    /**
     * Obtiene todos los tipos de movimiento de entrada (créditos)
     * 
     * @return array<string>
     */
    public static function getInflowTypes(): array
    {
        return [
            self::CREDIT_USAGE,
            self::CASH_PAYMENT,
            self::CARD_PAYMENT,
            self::TRANSFER_PAYMENT,
            self::ACCOUNT_PAYMENT,
        ];
    }
    
    /**
     * Obtiene todos los tipos de movimiento de salida (débitos)
     * 
     * @return array<string>
     */
    public static function getOutflowTypes(): array
    {
        return [
            self::SALE,
        ];
    }
}

