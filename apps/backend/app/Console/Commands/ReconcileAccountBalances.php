<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Models\CurrentAccount;
use Illuminate\Support\Facades\DB;

class ReconcileAccountBalances extends Command
{
    protected $signature = 'fix:reconcile-accounts {--dry-run : Run without making changes} {--account-id= : Fix specific account}';
    protected $description = 'Reconcile Current Account Balance with Pending Sales by applying unallocated credits';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $accountId = $this->option('account-id');

        $this->info($dryRun ? "🔍 RUNNING IN DRY-RUN MODE" : "⚠️  RUNNING IN EXECUTE MODE");

        $query = CurrentAccount::query();
        if ($accountId) {
            $query->where('id', $accountId);
        }

        $accounts = $query->get();
        $fixedCount = 0;

        foreach ($accounts as $account) {
            // Calculate actual total pending debt from sales
            $totalPendingSales = 0;
            $sales = collect([]);

            if ($account->customer_id) {
                $sales = SaleHeader::where('customer_id', $account->customer_id)
                    ->where('status', '!=', 'rejected')
                    ->where(function ($query) {
                        $query->whereNull('payment_status')
                            ->orWhereIn('payment_status', ['pending', 'partial']);
                    })
                    ->orderBy('date', 'asc') // Oldest first
                    ->get();

                foreach ($sales as $sale) {
                    if ($sale->pending_amount > 0.01) {
                        $totalPendingSales += $sale->pending_amount;
                    }
                }
            }

            // Current Balance in DB (e.g. 0.00)
            $currentBalance = $account->current_balance;

            // If we have Pending Debt > Current Balance, means we have "Hidden Credits" in the balance
            // that were not applied to the sales.
            // Example: Debt = 12900, Balance = 0.
            // Means we paid 12900 (balance went down), but sale is still pending.
            // Difference = 12900 - 0 = 12900 credit available to apply.

            // If Balance is POSITIVE, it means DEBT.
            // So if PendingDebt (100) > CurrentBalance (0), we have 100 unallocated credit.

            $epsilon = 0.01;

            if ($totalPendingSales > ($currentBalance + $epsilon)) {
                $unallocatedCredit = $totalPendingSales - $currentBalance;

                $this->alert("Account #{$account->id} (Customer {$account->customer_id}) needs reconciliation");
                $this->info("  Current Balance: {$currentBalance}");
                $this->info("  Total Pending Sales: {$totalPendingSales}");
                $this->info("  -> Unallocated Credit to Apply: {$unallocatedCredit}");

                if ($unallocatedCredit > 0.01) {
                    $fixedCount++;
                    $remainingCredit = $unallocatedCredit;

                    DB::beginTransaction();
                    try {
                        foreach ($sales as $sale) {
                            if ($remainingCredit <= 0.001)
                                break;

                            $pending = $sale->pending_amount;
                            if ($pending <= 0.01)
                                continue;

                            // Amount we can pay on this sale
                            $paymentAmount = min($pending, $remainingCredit);

                            $this->line("    Sale #{$sale->receipt_number}: Pending {$pending} -> Paying {$paymentAmount}");

                            if (!$dryRun) {
                                // Apply payment logic manually to avoid creating new movements
                                // We just want to update SaleHeader status
                                $sale->paid_amount += $paymentAmount;

                                // Check status update
                                if ($sale->paid_amount >= ($sale->total - 0.01)) {
                                    $sale->payment_status = 'paid';
                                    if (abs($sale->paid_amount - $sale->total) < 0.01) {
                                        $sale->paid_amount = $sale->total; // Snap to total
                                    }
                                } elseif ($sale->paid_amount > 0) {
                                    $sale->payment_status = 'partial';
                                }

                                $sale->save();
                                $this->info("      [FIXED] Sale updated.");
                            }

                            $remainingCredit -= $paymentAmount;
                        }

                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        $this->error("Error fixing account {$account->id}: " . $e->getMessage());
                    }
                }
            }
        }

        $this->info("\nDone. Fixed {$fixedCount} accounts.");
        return 0;
    }
}
