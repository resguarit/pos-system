<?php

declare(strict_types=1);

namespace App\Interfaces;

use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

interface CurrentAccountServiceInterface
{
    /**
     * Crear una nueva cuenta corriente
     */
    public function createAccount(array $data): CurrentAccount;

    /**
     * Obtener cuenta corriente por ID
     */
    public function getAccountById(int $id): ?CurrentAccount;

    /**
     * Obtener cuenta corriente por cliente
     */
    public function getAccountByCustomer(int $customerId): ?CurrentAccount;

    /**
     * Obtener todas las cuentas corrientes con filtros
     */
    public function getAllAccounts(array $filters = []): Collection;

    /**
     * Obtener cuentas corrientes paginadas
     */
    public function getAccountsPaginated(Request $request): LengthAwarePaginator;

    /**
     * Actualizar cuenta corriente
     */
    public function updateAccount(int $id, array $data): CurrentAccount;

    /**
     * Eliminar cuenta corriente (soft delete)
     */
    public function deleteAccount(int $id): bool;

    /**
     * Suspender cuenta corriente
     */
    public function suspendAccount(int $id, string $reason = null): CurrentAccount;

    /**
     * Reactivar cuenta corriente
     */
    public function reactivateAccount(int $id): CurrentAccount;

    /**
     * Cerrar cuenta corriente
     */
    public function closeAccount(int $id, string $reason = null): CurrentAccount;

    /**
     * Crear movimiento en cuenta corriente
     */
    public function createMovement(array $data): CurrentAccountMovement;

    /**
     * Obtener movimientos de una cuenta corriente
     */
    public function getAccountMovements(int $accountId, Request $request): LengthAwarePaginator;

    /**
     * Obtener balance de cuenta corriente
     */
    public function getAccountBalance(int $accountId): float;

    /**
     * Procesar pago en cuenta corriente
     *
     * @return array{total_amount: float, sales_processed: array<int, array{sale_id:int, receipt_number:string, amount_paid:float, new_status:string}>, account_balance: float}
     */
    public function processPayment(int $accountId, array $paymentData): array;

    /**
     * Procesar compra a crédito
     */
    public function processCreditPurchase(int $accountId, array $purchaseData): CurrentAccountMovement;

    /**
     * Verificar si hay crédito disponible
     */
    public function checkAvailableCredit(int $accountId, float $amount): bool;

    /**
     * Obtener estadísticas de cuenta corriente
     */
    public function getAccountStatistics(int $accountId): array;

    /**
     * Obtener estadísticas generales de cuentas corrientes
     */
    public function getGeneralStatistics(): array;

    /**
     * Obtener cuentas corrientes por estado
     */
    public function getAccountsByStatus(string $status): Collection;

    /**
     * Obtener cuentas corrientes con límite de crédito alcanzado
     */
    public function getAccountsAtCreditLimit(): Collection;

    /**
     * Obtener cuentas corrientes sobregiradas
     */
    public function getOverdrawnAccounts(): Collection;

    /**
     * Obtener movimientos por rango de fechas
     */
    public function getMovementsByDateRange(int $accountId, Carbon $from, Carbon $to): Collection;

    /**
     * Obtener resumen de movimientos por período
     */
    public function getMovementsSummary(int $accountId, Carbon $from, Carbon $to): array;

    /**
     * Exportar movimientos de cuenta corriente
     */
    public function exportMovements(int $accountId, Request $request): string;

    /**
     * Obtener historial de cambios de límite de crédito
     */
    public function getCreditLimitHistory(int $accountId): Collection;

    /**
     * Actualizar límite de crédito
     */
    public function updateCreditLimit(int $accountId, float $newLimit, string $reason = null): CurrentAccount;

    /**
     * Obtener cuentas corrientes por cliente con información adicional
     */
    public function getCustomerAccountsWithDetails(int $customerId): Collection;

    /**
     * Validar datos de cuenta corriente antes de crear/actualizar
     */
    public function validateAccountData(array $data): array;

    /**
     * Validar datos de movimiento antes de crear
     */
    public function validateMovementData(array $data): array;

    /**
     * Obtener cuentas corrientes próximas al límite
     */
    public function getAccountsNearCreditLimit(float $percentage = 80): Collection;

    /**
     * Obtener cuentas corrientes inactivas por tiempo
     */
    public function getInactiveAccounts(int $days = 90): Collection;

    /**
     * Generar reporte de cuentas corrientes
     */
    public function generateAccountsReport(array $filters = []): array;
}
