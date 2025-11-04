<?php

declare(strict_types=1);

namespace App\Services\CurrentAccount;

use App\Models\CurrentAccount;
use App\Exceptions\PermissionDeniedException;

/**
 * Valida permisos y reglas de negocio para operaciones en cuentas corrientes
 * 
 * Aplica el principio de Single Responsibility: solo valida operaciones
 */
class AccountOperationValidator
{
    /**
     * Valida que la cuenta esté activa para operaciones
     * 
     * @param CurrentAccount $account Cuenta corriente a validar
     * @throws \Exception Si la cuenta no está activa
     */
    public function validateAccountIsActive(CurrentAccount $account): void
    {
        if (!$account->isActive()) {
            $statusText = $account->status === 'suspended' ? 'suspendida' : 'cerrada';
            throw new \Exception("Cuenta corriente {$statusText}. No se puede operar.");
        }
    }

    /**
     * Valida que haya crédito disponible para un movimiento de salida
     * 
     * @param CurrentAccount $account Cuenta corriente
     * @param float $amount Monto del movimiento
     * @throws \Exception Si no hay crédito disponible
     */
    public function validateCreditAvailable(CurrentAccount $account, float $amount): void
    {
        if (!$account->hasAvailableCredit($amount)) {
            throw new \Exception('No hay crédito disponible para realizar este movimiento');
        }
    }

    /**
     * Valida que la cuenta esté activa y tenga crédito disponible para salidas
     * 
     * @param CurrentAccount $account Cuenta corriente
     * @param float $amount Monto del movimiento
     * @param string $operationType Tipo de operación ('entrada' o 'salida')
     * @throws \Exception Si alguna validación falla
     */
    public function validateOperation(CurrentAccount $account, float $amount, string $operationType): void
    {
        $this->validateAccountIsActive($account);
        
        if ($operationType === 'salida') {
            $this->validateCreditAvailable($account, $amount);
        }
    }
}

