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

class CheckStockConsistency extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:check {product_id?} {--branch=} {--fix : Attempt to fix stock (Not implemented yet)}';

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
        $productId = $this->argument('product_id');
        $branchId = $this->option('branch');

        $query = Product::query();
        if ($productId) {
            $query->where('id', $productId);
        }

        $products = $query->get();

        $branches = Branch::query();
        if ($branchId) {
            $branches->where('id', $branchId);
        }
        $branches = $branches->get();

        $this->info("Checking stock for " . $products->count() . " products in " . $branches->count() . " branches...");

        $headers = ['Product', 'Branch', 'DB Stock', 'Purchased (+)', 'Sold (-)', 'Cred. Notes (?)', 'Transfers (+/-)', 'Calculated', 'Diff', 'Manual Adjs'];
        $rows = [];

        $bar = $this->output->createProgressBar($products->count() * $branches->count());
        $bar->start();

        foreach ($products as $product) {
            foreach ($branches as $branch) {
                // 1. Get Current Stock in DB
                $stockRecord = Stock::where('product_id', $product->id)
                    ->where('branch_id', $branch->id)
                    ->first();
                $currentDbStock = $stockRecord ? (float) $stockRecord->current_stock : 0.0;

                // 2. Calculate Purchases (Incoming)
                // Purchase Orders must be 'completed'
                $purchasedQty = PurchaseOrderItem::where('product_id', $product->id)
                    ->whereHas('purchaseOrder', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->sum('quantity');

                // 3. Calculate Sales (Outgoing)
                // Sales must be active (not annulled), and not Budgets (Presupuesto)
                $salesQuery = SaleItem::where('product_id', $product->id)
                    ->whereHas('saleHeader', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', '!=', 'annulled') // Only active sales
                            ->whereHas('receiptType', function ($rt) {
                                $rt->where('afip_code', '!=', '016'); // Exclude Presupuestos
                            });
                    });

                $soldQty = $salesQuery->sum('quantity');

                // 4. Analyze Credit Notes (Notas de Crédito)
                // In standard accounting, these should ADD to stock (Returns). 
                // But we need to see if the system treats them as Sales currently.
                // We'll separate them for analysis.
                $creditNotesQty = SaleItem::where('product_id', $product->id)
                    ->whereHas('saleHeader', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', '!=', 'annulled')
                            ->whereHas('receiptType', function ($rt) {
                                // Codigos AFIP para Notas de Credito: 003, 008, 013
                                $rt->whereIn('afip_code', ['003', '008', '013']);
                            });
                    })
                    ->sum('quantity');

                // Adjust soldQty to exclude Credit Notes if they were included in the total sum
                // The $salesQuery above likely INCLUDED credit notes if they are just another SaleHeader with a type.
                // Let's verify if Credit Notes are indeed stored as SaleHeaders. Assuming yes for now.
                // So "Net Sold" should be (Total Sales - Credit Notes) if Credit Notes are Returns.
                // But wait, if the system is buggy, maybe it counts them as outflow.
                // For the "Calculated" column, we will assume the INTENDED logic:
                // Stock = Purchased - (Sales - Returns) + Transfers.
                // OR: Stock = Purchased - SalesInvoices + CreditNotes + Transfers.

                // Let's refine the "Sold" to be "Non-Credit Note Sales".
                $soldQtyOnlySales = SaleItem::where('product_id', $product->id)
                    ->whereHas('saleHeader', function ($q) use ($branch) {
                        $q->where('branch_id', $branch->id)
                            ->where('status', '!=', 'annulled')
                            ->whereHas('receiptType', function ($rt) {
                                $rt->whereNotIn('afip_code', ['016', '003', '008', '013']); // Exclude Budget AND Credit Notes
                            });
                    })
                    ->sum('quantity');

                // 5. Calculate Transfers
                // Incoming to this branch
                $transfersIn = StockTransferItem::where('product_id', $product->id)
                    ->whereHas('stockTransfer', function ($q) use ($branch) {
                        $q->where('destination_branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->sum('quantity');

                // Outgoing from this branch
                $transfersOut = StockTransferItem::where('product_id', $product->id)
                    ->whereHas('stockTransfer', function ($q) use ($branch) {
                        $q->where('source_branch_id', $branch->id)
                            ->where('status', 'completed');
                    })
                    ->sum('quantity');

                $netTransfers = $transfersIn - $transfersOut;

                // 6. Manual Adjustments (Activity Log)
                // This is hard to quantify exactly without parsing logs, but we can count them.
                // We look for logs on the 'stock' model subject.
                $manualAdjustmentsCount = 0;
                if ($stockRecord) {
                    $manualAdjustmentsCount = DB::table('activity_log')
                        ->where('subject_type', 'App\Models\Stock')
                        ->where('subject_id', $stockRecord->id)
                        ->where('description', 'updated') // Generic update
                        ->count();
                }

                // 7. Calculation
                // Assuming Credit Notes SHOULD BE Returns (Adding stock back)
                // But effectively they are often just "negative sales" or "returns".
                // If a Credit Note is a SaleHeader, its quantity is usually positive.
                // So if we have 10 products sold, and 1 returned via CN.
                // Sales table has: Sale (10), CN (1).
                // Logic should be: Stock = Initial + Purchases - Sales + CNs + Transfers.

                // Initial Stock? We assume 0 start unless we have an "Initial Inventory" record. 
                // Mostly systems rely on Adjustments for initial. 
                // If we rely on adjustments, the "Calculated" value is useless if we don't include them.
                // Since we can't easily parse textual "Adjustments" (Manual Sets),
                // This script highlights the *Transaction* flow. 
                // Large differences usually imply Manual Adjustments or Logic Bugs.

                // We will calculate assuming CNs are RETURNS (Add to stock).
                $calculatedStock = $purchasedQty - $soldQtyOnlySales + $creditNotesQty + $netTransfers;

                $diff = $currentDbStock - $calculatedStock;

                // Only show if there is activity or stock
                if ($currentDbStock != 0 || $purchasedQty != 0 || $soldQtyOnlySales != 0 || $creditNotesQty != 0 || $netTransfers != 0) {
                    $rows[] = [
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

        $bar->finish();
        $this->newLine();

        $this->table($headers, $rows);

        $this->info("Note: 'Calculated' assumes Initial Stock was 0. A large 'Diff' is expected if 'Manual Adjs' is YES (Initial Inventory was likely set manually).");
        $this->info("Note: 'Sold' column excludes Credit Notes. 'Cred. Notes' are added back to stock in calculation.");

        return 0;
    }
}
