<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Models\CurrentAccount;

class DebugSale extends Command
{
    protected $signature = 'debug:scan-anomalies';
    protected $description = 'Scan for accounts with balance mismatch';

    public function handle()
    {
        $this->info("Scanning for anomalies...");

        $accounts = CurrentAccount::all();
        $found = 0;

        foreach ($accounts as $account) {
            // Logic from CurrentAccountResource
            $totalPendingSales = 0;
            if ($account->customer_id) {
                $sales = SaleHeader::where('customer_id', $account->customer_id)
                    ->where('status', '!=', 'rejected')
                    ->where(function ($query) {
                        $query->whereNull('payment_status')
                            ->orWhereIn('payment_status', ['pending', 'partial']);
                    })
                    ->get();

                foreach ($sales as $sale) {
                    if ($sale->pending_amount > 0.01) {
                        $totalPendingSales += $sale->pending_amount;
                    }
                }
            }

            // Check discrepancy
            // If DB balance is ~0 but totalPendingSales > 0
            if (abs($account->current_balance) < 0.01 && $totalPendingSales > 0.01) {
                $this->error("ANOMALY FOUND: Account #{$account->id}");
                $this->info("  Customer: {$account->customer_id}");
                $this->info("  Current Balance: {$account->current_balance}");
                $this->info("  Calculated Pending Debt: {$totalPendingSales}");

                $this->info("  Pending Sales causing debt:");
                foreach ($sales as $sale) {
                    if ($sale->pending_amount > 0.01) {
                        $this->info("    - Sale #{$sale->receipt_number} (ID: {$sale->id}) Pending: {$sale->pending_amount} Status: {$sale->payment_status}");
                    }
                }
                $found++;
            }
        }

        $this->info("Scan complete. Found {$found} anomalies.");
        return 0;
    }
}
