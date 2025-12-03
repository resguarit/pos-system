<?php

declare(strict_types=1);

namespace App\Services\CurrentAccount;

use App\Models\MovementType;

/**
 * Calcula el cambio en el balance basado en el tipo de operación
 * 
 * Aplica el principio de Single Responsibility: solo calcula el cambio de balance
 */
class BalanceCalculator
{
    /**
     * Calcula el cambio en el balance según el tipo de operación
     * 
     * Balance positivo = cliente debe dinero (deuda)
     * 
     * @param float $amount Monto del movimiento
     * @param string $operationType Tipo de operación ('entrada' o 'salida')
     * @return float Cambio en el balance (positivo para aumentar deuda, negativo para reducir deuda)
     */
    public function calculateBalanceChange(float $amount, string $operationType): float
    {
        if ($operationType === 'salida') {
            // Salida (venta, compra): aumenta la deuda → balance aumenta (positivo)
            return $amount;
        }

        // Entrada (pago): reduce la deuda → balance disminuye (negativo)
        return -$amount;
    }

    /**
     * Calcula el nuevo balance después de aplicar un movimiento
     * 
     * @param float $currentBalance Balance actual
     * @param float $amount Monto del movimiento
     * @param string $operationType Tipo de operación ('entrada' o 'salida')
     * @return float Nuevo balance
     */
    public function calculateNewBalance(float $currentBalance, float $amount, string $operationType): float
    {
        $change = $this->calculateBalanceChange($amount, $operationType);
        return $currentBalance + $change;
    }

    /**
     * Calcula el nuevo balance desde un MovementType
     * 
     * @param float $currentBalance Balance actual
     * @param float $amount Monto del movimiento
     * @param MovementType $movementType Tipo de movimiento
     * @return float Nuevo balance
     */
    public function calculateNewBalanceFromMovementType(
        float $currentBalance,
        float $amount,
        MovementType $movementType
    ): float {
        return $this->calculateNewBalance($currentBalance, $amount, $movementType->operation_type);
    }
}

