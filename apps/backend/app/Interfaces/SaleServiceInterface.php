<?php

namespace App\Interfaces;

use Illuminate\Support\Collection;
use App\Models\SaleHeader;
use App\Models\ReceiptType;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

interface SaleServiceInterface
{
    public function getAllSales(Request $request): Collection;
    public function getSaleById(int $id): ?SaleHeader;
    public function createSale(array $data, bool $registerMovement = true): SaleHeader;
    public function emitCreditNote(int $originalSaleId, float $amount, string $reason, int $userId, ?int $cashRegisterId): SaleHeader;
    public function registerSaleMovementFromPayments(SaleHeader $sale, ?int $cashRegisterId = null): void;
    public function updateSale(int $id, array $data): ?SaleHeader;
    public function deleteSale(int $id): bool;
    public function getSalesTotalByBranchAndDate(int $branchId, string $from, string $to): float;
    public function getSalesSummary(Request $request): array;
    public function downloadPdf(int $id);
    /**
     * @param int $saleId
     * @param string $format 'standard'|'thermal'
     * @return array{html: string, format: string}|null
     */
    public function getReceiptPreviewHtml(int $saleId, string $format = 'standard'): ?array;
    public function getSalesHistoryByBranch(int $branchId, Request $request): array;
    public function getSalesSummaryAllBranches(Request $request): array;

    public function getAllSalesGlobal(Request $request);
    public function getSalesSummaryGlobal(Request $request);
    public function getSalesHistoryGlobal(Request $request);

    // Budget management methods
    public function convertBudgetToSale(int $budgetId, int $newReceiptTypeId, int $userId, ?int $cashRegisterId = null, ?int $paymentMethodId = null): SaleHeader;
    public function deleteBudget(int $budgetId, int $userId): bool;
    public function getBudgets(Request $request): LengthAwarePaginator;
    public function approveBudget(int $id): SaleHeader;

    // AFIP authorization methods
    /**
     * Verifica si una venta puede ser autorizada con AFIP.
     * 
     * @param SaleHeader $sale La venta a verificar
     * @param ReceiptType|null $receiptType El tipo de comprobante (opcional)
     * @return array{can_authorize: bool, reason: string, branch_cuit: ?string, certificate: ?\App\Models\ArcaCertificate}
     */
    public function canAuthorizeWithAfip(SaleHeader $sale, ?ReceiptType $receiptType = null): array;

    /**
     * Intenta autorizar una venta con AFIP de forma segura (no lanza excepciones).
     * 
     * @param SaleHeader $sale La venta a autorizar
     * @param ReceiptType|null $receiptType El tipo de comprobante (opcional)
     * @param string $context Contexto para logging
     * @return array{success: bool, cae: ?string, error: ?string, reason: ?string}
     */
    public function tryAuthorizeWithAfip(SaleHeader $sale, ?ReceiptType $receiptType = null, string $context = 'SaleService'): array;

    /**
     * Autoriza una venta con AFIP.
     * 
     * @param SaleHeader $sale La venta a autorizar
     * @return array Datos de la autorización (cae, cae_expiration_date, invoice_number, etc.)
     * @throws \Exception Si hay errores en la autorización
     */
    public function authorizeWithAfip(SaleHeader $sale): array;
}
