<?php

declare(strict_types=1);

namespace App\Services\CurrentAccount;

use App\Models\CurrentAccount;
use App\Models\MovementType;
use App\Models\SaleHeader;
use App\Services\CurrentAccountService;
use App\Constants\CurrentAccountMovementTypes;
use Exception;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para manejar el uso de crédito a favor en ventas
 * 
 * Aplica principios SOLID:
 * - SRP: Solo maneja la aplicación de crédito a favor
 * - OCP: Extensible para nuevos tipos de crédito
 * - DIP: Depende de abstracciones (CurrentAccountService)
 */
class FavorCreditService
{
    private CurrentAccountService $currentAccountService;

    public function __construct(CurrentAccountService $currentAccountService)
    {
        $this->currentAccountService = $currentAccountService;
    }

    /**
     * Aplica crédito a favor a una venta si está especificado en los metadatos
     * 
     * @param CurrentAccount $account Cuenta corriente del cliente
     * @param SaleHeader $sale Venta a la que aplicar el crédito
     * @param float|null $balanceBeforeSale Balance ANTES de registrar la venta (para calcular crédito disponible correctamente)
     * @return void
     * @throws Exception Si hay error al aplicar el crédito
     */
    public function applyCreditIfRequested(CurrentAccount $account, SaleHeader $sale, ?float $balanceBeforeSale = null): void
    {
        $metadata = $sale->metadata ?? [];
        $useFavorCredit = $metadata['use_favor_credit'] ?? false;
        $requestedAmount = isset($metadata['favor_credit_amount']) 
            ? (float) $metadata['favor_credit_amount'] 
            : 0.0;
        
        Log::info('Verificando crédito a favor para venta', [
            'sale_id' => $sale->id,
            'account_id' => $account->id,
            'metadata' => $metadata,
            'use_favor_credit' => $useFavorCredit,
            'requested_amount' => $requestedAmount,
            'balance_before_sale' => $balanceBeforeSale,
            'current_balance' => $account->current_balance,
        ]);
        
        if (!$useFavorCredit || $requestedAmount <= 0) {
            Log::debug('Crédito a favor no solicitado o monto inválido', [
                'sale_id' => $sale->id,
                'use_favor_credit' => $useFavorCredit,
                'requested_amount' => $requestedAmount,
            ]);
            return;
        }

        // IMPORTANTE: El crédito disponible debe calcularse con el balance ANTES de registrar la venta
        // Porque la venta aumenta el balance y podría hacer que el balance deje de ser negativo
        // El crédito disponible es el balance negativo ANTES de la venta, porque después de la venta
        // el balance puede ser positivo (deuda) y ya no habría crédito disponible
        if ($balanceBeforeSale !== null) {
            // El crédito disponible es el balance negativo antes de la venta
            // porque después de registrar la venta, el balance puede cambiar a positivo
            $availableCredit = $balanceBeforeSale < 0 ? abs($balanceBeforeSale) : 0.0;
            
            Log::info('Crédito disponible calculado desde balance antes de venta', [
                'sale_id' => $sale->id,
                'balance_before_sale' => $balanceBeforeSale,
                'current_balance' => $account->current_balance,
                'available_credit' => $availableCredit,
            ]);
        } else {
            // Fallback: recargar cuenta y calcular normalmente (puede no ser preciso si la venta ya se registró)
            $account->refresh();
            $currentBalance = (float) $account->current_balance;
            $availableCredit = $currentBalance < 0 ? abs($currentBalance) : 0.0;
            Log::warning('Balance antes de venta no proporcionado, usando balance actual', [
                'sale_id' => $sale->id,
                'current_balance' => $currentBalance,
                'available_credit' => $availableCredit,
            ]);
        }
        
        Log::info('Crédito disponible calculado', [
            'sale_id' => $sale->id,
            'account_id' => $account->id,
            'balance_before_sale' => $balanceBeforeSale,
            'available_credit' => $availableCredit,
            'requested_amount' => $requestedAmount,
        ]);
        
        if ($availableCredit <= 0) {
            Log::warning('Crédito a favor solicitado pero no disponible', [
                'sale_id' => $sale->id,
                'account_id' => $account->id,
                'requested_amount' => $requestedAmount,
                'available_credit' => $availableCredit,
                'balance_before_sale' => $balanceBeforeSale,
            ]);
            return;
        }

        // Aplicar solo el monto disponible o el solicitado, el que sea menor
        $creditToApply = min($requestedAmount, $availableCredit);
        
        // Verificar que no se haya aplicado ya este crédito para esta venta
        if ($this->hasCreditAlreadyApplied($account->id, $sale->id)) {
            Log::info('Crédito a favor ya aplicado para esta venta', [
                'sale_id' => $sale->id,
                'account_id' => $account->id,
            ]);
            return;
        }

        try {
            Log::info('Aplicando crédito a favor', [
                'sale_id' => $sale->id,
                'account_id' => $account->id,
                'credit_to_apply' => $creditToApply,
                'available_credit' => $availableCredit,
            ]);
            
            // Pasar el crédito disponible calculado para evitar que se recalcule con el balance actualizado
            $movement = $this->currentAccountService->applyFavorCreditToSale(
                $account->id,
                $sale->id,
                $creditToApply,
                $availableCredit // Pasar el crédito disponible calculado previamente
            );
            
            Log::info('Crédito a favor aplicado exitosamente', [
                'sale_id' => $sale->id,
                'account_id' => $account->id,
                'amount' => $creditToApply,
                'movement_id' => $movement->id,
            ]);
        } catch (Exception $e) {
            // Log error pero no fallar la venta si ya se registró
            Log::error('Error al aplicar crédito a favor', [
                'sale_id' => $sale->id,
                'account_id' => $account->id,
                'amount' => $creditToApply,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Re-lanzar solo si es crítico
            if ($this->isCriticalError($e)) {
                throw $e;
            }
        }
    }

    /**
     * Verifica si ya se aplicó crédito a favor para esta venta
     * 
     * @param int $accountId ID de la cuenta corriente
     * @param int $saleId ID de la venta
     * @return bool True si ya se aplicó crédito
     */
    private function hasCreditAlreadyApplied(int $accountId, int $saleId): bool
    {
        // Buscar movimiento de crédito a favor con cualquiera de los tipos posibles
        $creditUsageType = $this->getCreditUsageMovementType();
        $accountPaymentType = MovementType::where('name', CurrentAccountMovementTypes::ACCOUNT_PAYMENT)
            ->where('operation_type', 'entrada')
            ->where('is_current_account_movement', true)
            ->where('active', true)
            ->first();
        
        $query = \App\Models\CurrentAccountMovement::where('sale_id', $saleId)
            ->where('current_account_id', $accountId);
        
        // Buscar por cualquiera de los tipos posibles
        $typeIds = [];
        if ($creditUsageType) {
            $typeIds[] = $creditUsageType->id;
        }
        if ($accountPaymentType) {
            $typeIds[] = $accountPaymentType->id;
        }
        
        if (empty($typeIds)) {
            return false;
        }
        
        return $query->whereIn('movement_type_id', $typeIds)->exists();
    }

    /**
     * Obtiene el tipo de movimiento para uso de crédito a favor
     * 
     * @return MovementType|null Tipo de movimiento o null si no existe
     */
    private function getCreditUsageMovementType(): ?MovementType
    {
        return MovementType::where('name', CurrentAccountMovementTypes::CREDIT_USAGE)
            ->where('operation_type', 'entrada')
            ->where('is_current_account_movement', true)
            ->where('active', true)
            ->first();
    }

    /**
     * Determina si un error es crítico y debe interrumpir el proceso
     * 
     * @param Exception $e Excepción a evaluar
     * @return bool True si es crítico
     */
    private function isCriticalError(Exception $e): bool
    {
        // Errores críticos que requieren interrumpir la operación
        $criticalMessages = [
            sprintf('Tipo de movimiento "%s" no encontrado', CurrentAccountMovementTypes::CREDIT_USAGE),
            'Cuenta corriente no encontrada',
        ];

        foreach ($criticalMessages as $criticalMessage) {
            if (str_contains($e->getMessage(), $criticalMessage)) {
                return true;
            }
        }

        return false;
    }
}

