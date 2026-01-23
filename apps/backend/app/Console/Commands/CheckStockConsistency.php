<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\Stock;
use App\Models\SaleItem;
use App\Models\PurchaseOrderItem;
use App\Models\StockTransferItem;
use App\Models\Branch;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CheckStockConsistency extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:check {product_id_or_code?} {--branch=} {--fix : Attempt to fix stock (Not implemented yet)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check consistency between current stock and historical transactions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $input = $this->argument('product_id_or_code');
        $branchId = $this->option('branch');

        $query = Product::query();

        // Determine if input is ID or Code
        if ($input) {
            $productById = null;
            if (is_numeric($input)) {
                // Try to find by ID first
                $productById = Product::find($input);
            }

            if ($productById) {
                $query->where('id', $input);
            } else {
                // Convert to string just in case
                $query->where('code', (string) $input);
            }
        }

        $products = $query->get();

        if ($products->isEmpty()) {
            $this->error("No stored products found for input: " . ($input ?: 'ALL'));
            return 1;
        }

        $branches = Branch::query();
        if ($branchId) {
            $branches->where('id', $branchId);
        }
        $branches = $branches->get();

        // If checking a single product, show detailed history
        $showDetailedHistory = ($products->count() === 1);

        if (!$showDetailedHistory) {
            $this->info("Checking stock for " . $products->count() . " products in " . $branches->count() . " branches...");
        }

        $summaryHeaders = ['Product', 'Branch', 'DB Stock', 'Purchased (+)', 'Sold (-)', 'Cred. Notes (?)', 'Transfers (+/-)', 'Calculated', 'Diff', 'Manual Adjs'];
        $summaryRows = [];

        if (!$showDetailedHistory) {
            $bar = $this->output->createProgressBar($products->count() * $branches->count());
            $bar->start();
        }

        foreach ($products as $product) {
            foreach ($branches as $branch) {
                // 1. Get Current Stock in DB
                $stockRecord = Stock::where('product_id', $product->id)
                    ->where('branch_id', $branch->id)
                    ->first();
                $currentDbStock = $stockRecord ? (float) $stockRecord->current_stock : 0.0;

                // 2. Fetch Data
                // Purchases
                $purchaseItems = PurchaseOrderItem::where('product_id', $product->id)
                    ->whereHas('purchaseOrder', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->with('purchaseOrder')
                    ->get();
                $purchasedQty = $purchaseItems->sum('quantity');

                // Sales (Active, excluding Budgets)
                $saleItems = SaleItem::where('product_id', $product->id)
                    ->whereHas('saleHeader', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', '!=', 'annulled') // Only active
                            ->whereHas('receiptType', function ($rt) {
                                $rt->where('afip_code', '!=', '016'); // Exclude Presupuestos
                            });
                    })
                    ->with(['saleHeader.receiptType'])
                    ->get();

                // Separate Credit Notes
                $creditNotesItems = $saleItems->filter(function ($item) {
                    $code = $item->saleHeader->receiptType->afip_code ?? '';
                    return in_array($code, ['003', '008', '013']);
                });
                $normalSaleItems = $saleItems->filter(function ($item) {
                    $code = $item->saleHeader->receiptType->afip_code ?? '';
                    return !in_array($code, ['003', '008', '013']);
                });

                $soldQtyOnlySales = $normalSaleItems->sum('quantity');
                $creditNotesQty = $creditNotesItems->sum('quantity');

                // Transfers
                // In
                $transfersInItems = StockTransferItem::where('product_id', $product->id)
                    ->whereHas('stockTransfer', function ($q) use ($branch) {
                        $q->where('destination_branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->with('stockTransfer')
                    ->get();
                $transfersInQty = $transfersInItems->sum('quantity');

                // Out
                $transfersOutItems = StockTransferItem::where('product_id', $product->id)
                    ->whereHas('stockTransfer', function ($q) use ($branch) {
                        $q->where('source_branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->with('stockTransfer')
                    ->get();
                $transfersOutQty = $transfersOutItems->sum('quantity');

                $netTransfers = $transfersInQty - $transfersOutQty;

                // Manual Adjustments Count
                $manualAdjustmentsCount = 0;
                $activityLogs = collect();
                if ($stockRecord) {
                    $activityLogs = DB::table('activity_log')
                        ->where('subject_type', 'App\Models\Stock')
                        ->where('subject_id', $stockRecord->id)
                        // Getting all logs to display in history
                        ->orderBy('created_at')
                        ->get();

                    // Filter for what likely looks like a manual update (generic update)
                    $manualAdjustmentsCount = $activityLogs->where('description', 'updated')->count();
                }

                // Calculation
                $calculatedStock = $purchasedQty - $soldQtyOnlySales + $creditNotesQty + $netTransfers;
                $diff = $currentDbStock - $calculatedStock;

                if ($showDetailedHistory) {
                    $this->showDetailedHistoryTable(
                        $product,
                        $branch,
                        $purchaseItems,
                        $normalSaleItems,
                        $creditNotesItems,
                        $transfersInItems,
                        $transfersOutItems,
                        $activityLogs,
                        $currentDbStock,
                        $calculatedStock
                    );
                } else {
                    // Summary Mode
                    if ($currentDbStock != 0 || $purchasedQty != 0 || $soldQtyOnlySales != 0 || $creditNotesQty != 0 || $netTransfers != 0) {
                        $summaryRows[] = [
                            $product->description . " (ID: {$product->id})",
                            $branch->description,
                            $currentDbStock,
                            $purchasedQty,
                            $soldQtyOnlySales,
                            $creditNotesQty,
                            $netTransfers,
                            $calculatedStock,
                            $diff,
                            $manualAdjustmentsCount > 0 ? "YES ($manualAdjustmentsCount)" : 'No'
                        ];
                    }
                    $bar->advance();
                }
            }
        }

        if (!$showDetailedHistory) {
            $bar->finish();
            $this->newLine();
            $this->table($summaryHeaders, $summaryRows);
            $this->info("Note: 'Calculated' assumes Initial Stock was 0.");
        }

        return 0;
    }

    private function showDetailedHistoryTable($product, $branch, $purchases, $sales, $creditNotes, $transfersIn, $transfersOut, $logs, $currentStock, $calculated)
    {
        $this->info("Detailed History for: " . $product->description . " (Code: {$product->code}) in Branch: " . $branch->description);
        $this->info("Current DB Stock: " . $currentStock);
        $this->info("-----------------------------------------------------");

        $events = collect();

        // Add Purchases
        foreach ($purchases as $p) {
            $events->push([
                'date' => $p->purchaseOrder->created_at, // Or updated_at / order_date
                'type' => 'Purchase',
                'ref' => "PO #" . $p->purchaseOrder->id,
                'qty_change' => $p->quantity,
                // 'balance_impact' => '+'
            ]);
        }

        // Add Sales
        foreach ($sales as $s) {
            $events->push([
                'date' => $s->saleHeader->created_at,
                'type' => 'Sale',
                'ref' => "Sale #" . $s->saleHeader->receipt_number,
                'qty_change' => -$s->quantity,
                // 'balance_impact' => '-'
            ]);
        }

        // Add Credit Notes
        foreach ($creditNotes as $cn) {
            $events->push([
                'date' => $cn->saleHeader->created_at,
                'type' => 'Credit Note',
                'ref' => "CN #" . $cn->saleHeader->receipt_number,
                'qty_change' => $cn->quantity, // Assuming Returns ADD stock
                // 'balance_impact' => '+'
            ]);
        }

        // Add Transfers In
        foreach ($transfersIn as $t) {
            $events->push([
                'date' => $t->stockTransfer->updated_at, // Use completion date roughly
                'type' => 'Transfer In',
                'ref' => "Transfer #" . $t->stockTransfer->id,
                'qty_change' => $t->quantity,
                // 'balance_impact' => '+'
            ]);
        }

        // Add Transfers Out
        foreach ($transfersOut as $t) {
            $events->push([
                'date' => $t->stockTransfer->updated_at,
                'type' => 'Transfer Out',
                'ref' => "Transfer #" . $t->stockTransfer->id,
                'qty_change' => -$t->quantity,
                // 'balance_impact' => '-'
            ]);
        }

        // Add Manual Adjustments (Logs)
        foreach ($logs as $log) {
            // Try to extract old and new stock from properties to show exact change
            $props = json_decode($log->properties, true);
            // Often activity log properties are already array if casted in model, but DB returns string or array.
            // Let's check type.
            if (is_string($log->properties)) {
                $props = json_decode($log->properties, true);
            } elseif (is_object($log->properties)) {
                $props = (array) $log->properties;
            } else {
                $props = $log->properties; // Assume array
            }

            $qtyChange = 0;
            $details = $log->description;
            $balanceSet = null;

            if (isset($props['old']['current_stock']) && isset($props['attributes']['current_stock'])) {
                $old = $props['old']['current_stock'];
                $new = $props['attributes']['current_stock'];
                $qtyChange = $new - $old;
                $details .= " ($old -> $new)";
            } elseif ($log->description === 'created') {
                if (isset($props['attributes']['current_stock'])) {
                    $qtyChange = $props['attributes']['current_stock'];
                    $details .= " (Initial: $qtyChange)";
                }
            }

            // Only add if we detected a stock change or it's significant
            if ($qtyChange != 0 || $log->description === 'updated') {
                $events->push([
                    'date' => $log->created_at,
                    'type' => 'Manual Adj (Log)',
                    'ref' => "Log #" . $log->id . " $details",
                    'qty_change' => $qtyChange,
                    // NOTE: Manual adjustments RESET the running balance in reality, but here we treat them as deltas for the "History" view 
                    // unless we want to "Reset" the balance column.
                    'balance_set' => isset($props['attributes']['current_stock']) ? $props['attributes']['current_stock'] : null
                ]);
            }
        }

        // Sort by Date
        $sortedEvents = $events->sortBy(function ($e) {
            return Carbon::parse($e['date'])->timestamp;
        });

        $rows = [];
        $runningBalance = 0;

        foreach ($sortedEvents as $e) {
            $changeStr = $e['qty_change'];
            if ($changeStr > 0)
                $changeStr = "+$changeStr";

            // If it's a Update Log, it effectively SETS the balance
            if (isset($e['balance_set']) && !is_null($e['balance_set'])) {
                $runningBalance = $e['balance_set']; // Reset balance to what was set
                $rows[] = [
                    $e['date'],
                    $e['type'],
                    $e['ref'],
                    $e['qty_change'] > 0 ? "+{$e['qty_change']} (Set)" : "{$e['qty_change']} (Set)",
                    $runningBalance
                ];
            } else {
                $runningBalance += $e['qty_change'];
                $rows[] = [
                    $e['date'],
                    $e['type'],
                    $e['ref'],
                    $changeStr,
                    $runningBalance
                ];
            }
        }

        $this->table(['Date', 'Type', 'Reference', 'Change', 'Running Balance'], $rows);

        $this->info("Final Calculated Balance (History): " . $runningBalance);
        $this->info("Actual DB Balance: " . $currentStock);

        if (abs($runningBalance - $currentStock) > 0.01) {
            $this->warn("Mismatch detected! If no 'Manual Adj' rows appear above, there might be hidden transactions or bugs.");
        } else {
            $this->info("Matches perfectly!");
        }
    }
}
