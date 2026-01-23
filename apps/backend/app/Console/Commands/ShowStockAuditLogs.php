<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;

class ShowStockAuditLogs extends Command
{
    protected $signature = 'stock:audit {product_id} {--branch=}';
    protected $description = 'Show detailed audit logs for a product stock, proving manual vs system changes';

    public function handle()
    {
        $productId = $this->argument('product_id');
        $branchId = $this->option('branch');

        // Find stock record(s)
        $stockQuery = Stock::where('product_id', $productId);
        if ($branchId) {
            $stockQuery->where('branch_id', $branchId);
        }
        $stocks = $stockQuery->with(['product', 'branch'])->get();

        if ($stocks->isEmpty()) {
            $this->error("No stock records found for product ID: $productId");
            return 1;
        }

        foreach ($stocks as $stock) {
            $this->info("\n========================================");
            $this->info("AUDIT LOGS FOR STOCK ID: {$stock->id}");
            $this->info("Product: {$stock->product->description} (ID: {$stock->product_id})");
            $this->info("Branch: {$stock->branch->description} (ID: {$stock->branch_id})");
            $this->info("Current Stock: {$stock->current_stock}");
            $this->info("========================================\n");

            // Get ALL activity logs for this stock record
            $logs = DB::table('activity_log')
                ->where('subject_type', 'App\Models\Stock')
                ->where('subject_id', $stock->id)
                ->orderBy('created_at', 'asc')
                ->get();

            if ($logs->isEmpty()) {
                $this->warn("No audit logs found for this stock record.");
                continue;
            }

            $rows = [];
            foreach ($logs as $log) {
                $props = json_decode($log->properties, true);

                // Extract old/new values
                $oldStock = $props['old']['current_stock'] ?? '-';
                $newStock = $props['attributes']['current_stock'] ?? '-';

                // Extract URL (key evidence!)
                $url = $props['url'] ?? 'N/A';
                $method = $props['method'] ?? '';

                // Extract IP
                $ip = $props['ip_address'] ?? 'N/A';

                // Get causer (user)
                $causer = 'System';
                if ($log->causer_id) {
                    $user = \App\Models\User::with('person')->find($log->causer_id);
                    if ($user && $user->person) {
                        $causer = "{$user->person->first_name} {$user->person->last_name} ({$user->username})";
                    } elseif ($user) {
                        $causer = $user->username ?? "User #{$log->causer_id}";
                    }
                }

                // Determine if MANUAL or SYSTEM based on URL
                $isManual = false;
                $actionType = 'SYSTEM';

                if (str_contains($url, '/api/stocks')) {
                    $isManual = true;
                    $actionType = '⚠️ MANUAL (API Stock)';
                } elseif (str_contains($url, '/api/pos/sales')) {
                    $actionType = 'Sale (POS)';
                } elseif (str_contains($url, '/annul')) {
                    $actionType = 'Sale Annulment';
                } elseif (str_contains($url, '/api/purchase-orders')) {
                    $actionType = 'Purchase Order';
                } elseif (str_contains($url, '/api/stock-transfers')) {
                    $actionType = 'Stock Transfer';
                } else {
                    // Generic update - likely manual
                    if ($log->description === 'updated' && !str_contains($url, '/pos/') && !str_contains($url, '/purchase')) {
                        $isManual = true;
                        $actionType = '⚠️ MANUAL?';
                    }
                }

                $change = '-';
                if (is_numeric($oldStock) && is_numeric($newStock)) {
                    $diff = $newStock - $oldStock;
                    $change = $diff >= 0 ? "+$diff" : "$diff";
                }

                $rows[] = [
                    $log->created_at,
                    $causer,
                    $log->description,
                    $oldStock,
                    $newStock,
                    $change,
                    $actionType,
                    $ip,
                    strlen($url) > 50 ? '...' . substr($url, -47) : $url
                ];
            }

            $this->table(
                ['Date', 'User', 'Event', 'Old', 'New', 'Change', 'Action Type', 'IP', 'URL'],
                $rows
            );

            $this->newLine();

            // Summary
            $manualCount = collect($rows)->filter(fn($r) => str_contains($r[6], 'MANUAL'))->count();
            if ($manualCount > 0) {
                $this->error("⚠️  FOUND $manualCount MANUAL ADJUSTMENT(S)!");
                $this->info("These are changes made directly via the Stock API, NOT through normal business operations (sales, purchases, etc.).");
            } else {
                $this->info("✓ All changes appear to be from normal system operations.");
            }
        }

        return 0;
    }
}
