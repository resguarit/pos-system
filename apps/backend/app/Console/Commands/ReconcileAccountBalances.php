<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Models\CurrentAccount;
use Illuminate\Support\Facades\DB;

class ReconcileAccountBalances extends Command
{
    protected $signature = 'fix:reconcile-accounts 
                            {--dry-run : Run without making changes} 
                            {--account-id= : Fix specific account}
                            {--verbose-all : Show all accounts, not just problematic ones}';

    protected $description = 'Reconcile Current Account Balance with actual pending sales totals';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $accountId = $this->option('account-id');
        $verboseAll = $this->option('verbose-all');

        $this->info($dryRun ? "🔍 RUNNING IN DRY-RUN MODE" : "⚠️  RUNNING IN EXECUTE MODE");
        $this->newLine();

        $query = CurrentAccount::with('customer');
        if ($accountId) {
            $query->where('id', $accountId);
        }

        $accounts = $query->get();
        $fixedCount = 0;
        $problemsFound = [];

        foreach ($accounts as $account) {
            // Calculate REAL total pending debt from sales
            $realPendingDebt = $this->calculateRealPendingDebt($account);

            // Current Balance stored in DB
            $storedBalance = (float) $account->current_balance;

            // Epsilon for float comparison
            $epsilon = 0.01;

            // Check for discrepancies
            $balanceDiscrepancy = abs($storedBalance - $realPendingDebt) > $epsilon;

            if ($balanceDiscrepancy || $verboseAll) {
                $customerName = $account->customer
                    ? ($account->customer->person
                        ? trim($account->customer->person->first_name . ' ' . $account->customer->person->last_name)
                        : $account->customer->email)
                    : 'Sin cliente';

                if ($balanceDiscrepancy) {
                    $this->error("❌ Account #{$account->id} - {$customerName}");
                    $problemsFound[] = [
                        'id' => $account->id,
                        'customer' => $customerName,
                        'stored_balance' => $storedBalance,
                        'real_pending_debt' => $realPendingDebt,
                        'difference' => $realPendingDebt - $storedBalance,
                    ];
                } else {
                    $this->info("✅ Account #{$account->id} - {$customerName}");
                }

                $this->line("   Stored current_balance:    \${$storedBalance}");
                $this->line("   Real pending from sales:   \${$realPendingDebt}");

                if ($balanceDiscrepancy) {
                    $diff = $realPendingDebt - $storedBalance;
                    $this->line("   -> Difference: " . ($diff >= 0 ? '+' : '') . "\${$diff}");

                    if (!$dryRun) {
                        try {
                            DB::beginTransaction();

                            // Update the account balance
                            $account->current_balance = $realPendingDebt;
                            $account->save();

                            DB::commit();

                            $fixedCount++;
                            $this->info("   [FIXED] Balance updated to \${$realPendingDebt}");
                        } catch (\Exception $e) {
                            DB::rollBack();
                            $this->error("   [ERROR] " . $e->getMessage());
                        }
                    } else {
                        $this->warn("   [WOULD FIX] Balance would be set to \${$realPendingDebt}");
                    }
                }

                $this->newLine();
            }
        }

        // Summary
        $this->newLine();
        $this->info("=== SUMMARY ===");
        $this->line("Total accounts checked: " . $accounts->count());
        $this->line("Accounts with discrepancies: " . count($problemsFound));

        if ($dryRun) {
            $this->warn("Accounts that WOULD be fixed: " . count($problemsFound));
        } else {
            $this->info("Accounts fixed: {$fixedCount}");
        }

        // Table summary of problems
        if (count($problemsFound) > 0) {
            $this->newLine();
            $this->table(
                ['ID', 'Cliente', 'Saldo Guardado', 'Deuda Real', 'Diferencia'],
                array_map(fn($p) => [
                    $p['id'],
                    substr($p['customer'], 0, 25),
                    '$' . number_format($p['stored_balance'], 2),
                    '$' . number_format($p['real_pending_debt'], 2),
                    ($p['difference'] >= 0 ? '+$' : '-$') . number_format(abs($p['difference']), 2),
                ], $problemsFound)
            );
        }

        return 0;
    }

    /**
     * Calculate the real pending debt from actual sales
     */
    private function calculateRealPendingDebt(CurrentAccount $account): float
    {
        if (!$account->customer_id) {
            return 0;
        }

        // Get all non-annulled, non-rejected sales for this customer
        // that are pending or partial payment
        $pendingSales = SaleHeader::where('customer_id', $account->customer_id)
            ->whereNotIn('status', ['rejected', 'annulled'])
            ->where(function ($query) {
                $query->whereNull('payment_status')
                    ->orWhereIn('payment_status', ['pending', 'partial']);
            })
            ->get();

        $totalPending = 0;
        foreach ($pendingSales as $sale) {
            // We use the 'pending_amount' accessor or calculation
            // Assuming pending_amount is available on SaleHeader model
            // If not, we should calculate it: total - paid_amount
            $pending = $sale->pending_amount;
            if ($pending > 0.01) {
                $totalPending += $pending;
            }
        }

        return round($totalPending, 2);
    }
}
