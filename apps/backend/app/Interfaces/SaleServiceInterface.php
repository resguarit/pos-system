<?php

namespace App\Interfaces;

use Illuminate\Support\Collection;
use App\Models\SaleHeader;
use Illuminate\Http\Request;

interface SaleServiceInterface
{
    public function getAllSales(Request $request): Collection;
    public function getSaleById(int $id): ?SaleHeader;
    public function createSale(array $data, bool $registerMovement = true): SaleHeader;
    public function registerSaleMovementFromPayments(SaleHeader $sale, ?int $cashRegisterId = null): void;
    public function updateSale(int $id, array $data): ?SaleHeader;
    public function deleteSale(int $id): bool;
    public function getSalesTotalByBranchAndDate(int $branchId, string $from, string $to): float;
    public function getSalesSummary(Request $request): array;
    public function downloadPdf(int $id);
    public function getSalesHistoryByBranch(int $branchId, Request $request): array;
    public function getSalesSummaryAllBranches(Request $request): array;

    public function getAllSalesGlobal(Request $request);
    public function getSalesSummaryGlobal(Request $request);
    public function getSalesHistoryGlobal(Request $request);

    // Budget management methods
    public function convertBudgetToSale(int $budgetId, int $newReceiptTypeId, int $userId, ?int $cashRegisterId = null): SaleHeader;
    public function deleteBudget(int $budgetId, int $userId): bool;
    public function getBudgets(Request $request): Collection;
    public function approveBudget(int $id): SaleHeader;
}
