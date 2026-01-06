<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use Illuminate\Support\Facades\DB;

class RecalculateAccountBalance extends Command
{
    protected $signature = 'fix:recalculate-balance {--dry-run : Run without making changes} {--account-id= : Account to recalculate}';
    protected $description = 'Recalculate Current Account Balance by summing all historical movements';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $accountId = $this->option('account-id');

        if (!$accountId) {
            $this->error("Please provide an --account-id");
            return 1;
        }

        $this->info($dryRun ? "🔍 RUNNING IN DRY-RUN MODE" : "⚠️  RUNNING IN EXECUTE MODE");

        $account = CurrentAccount::find($accountId);
        if (!$account) {
            $this->error("Account #{$accountId} not found.");
            return 1;
        }

        $this->info("Recalculating balance for Account #{$account->id} (Customer {$account->customer_id})");
        $this->info("Current Stored Balance: {$account->current_balance}");

        // Calculate balance from movements
        // We need to fetch all movements ordered by date to simulate the timeline,
        // OR simply sum them up if the operation implies a simple aggregation.
        // However, the BalanceCalculator logic implies specific signs.
        // 'salida' (Sale) = +Amount
        // 'entrada' (Payment) = -Amount

        $movements = CurrentAccountMovement::with('movementType')
            ->where('current_account_id', $account->id)
            ->get();

        $calculatedBalance = 0.0;

        foreach ($movements as $movement) {
            $amount = (float) $movement->amount;
            $type = $movement->movementType->operation_type; // 'entrada' or 'salida'

            if ($type === 'salida') {
                $calculatedBalance += $amount;
            } elseif ($type === 'entrada') {
                $calculatedBalance -= $amount;
            }
        }

        // Apply clamping logic IF we want to enforce "No Negative Balance"
        // BUT the user's issue is specifically that clamping messed up the intermediate state.
        // If we want to arrive at the TRUE mathematical balance (which should be 0), we should NOT clamp intermediate steps.
        // What about the FINAL balance?
        // If the final balance is negative, it means the customer has credit. 
        // The user said "o me debe o es 0".
        // But if they paid extra (or an annulment happened weirdly), it might be negative.
        // Let's print the raw calculated balance.

        $this->info("Calculated Balance (Sum of Movements): {$calculatedBalance}");

        if (abs($calculatedBalance - $account->current_balance) < 0.01) {
            $this->info("✅ Balance is already correct.");
            return 0;
        }

        $this->warn("❌ Balance Mismatch detected!");

        if (!$dryRun) {
            // Update the account
            // We'll update the balance directly to the calculated value.
            // If the user insists on "no negative", we might clamp here, but 
            // the goal is to fix the anomaly. If it's -0.00 (float precision), we treat as 0.

            if (abs($calculatedBalance) < 0.01) {
                $calculatedBalance = 0;
            }

            // If strictly no negative allowed:
            if ($calculatedBalance < 0) {
                $this->warn("Calculated balance is negative ({$calculatedBalance}). Clamping to 0 as per business rule?");
                // For now, let's leave it as is or clamp? 
                // The user wants to fix the ghost debt. If it's 0, it's 0.
                // If it's effectively 0, we set to 0. 
                // If it really is negative, maybe we SHOULD set it to 0 if that's the rule.
                $calculatedBalance = max(0, $calculatedBalance);
            }

            $account->current_balance = $calculatedBalance;
            $account->save();

            $this->info("✅ Account balance updated to: {$calculatedBalance}");
        }

        return 0;
    }
}
