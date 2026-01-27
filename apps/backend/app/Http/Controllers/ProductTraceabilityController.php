<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\ProductCostHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductTraceabilityController extends Controller
{
    /**
     * Get traceability history for a product.
     * This combines stock movements, cost history, and potentially sales/purchases directly.
     */
    public function getHistory(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);
        $branchIds = $request->query('branch_ids');
        if ($branchIds && is_string($branchIds)) {
            $branchIds = explode(',', $branchIds);
        }

        // 1. Get Stock Movements (Source of truth for quantitative changes)
        $movementsQuery = StockMovement::with(['branch', 'user', 'reference'])
            ->where('product_id', $productId);

        if ($branchIds) {
            $movementsQuery->whereIn('branch_id', $branchIds);
        }

        $movements = $movementsQuery->get()
            ->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'date' => $movement->created_at->toIso8601String(),
                    'type' => 'stock_movement',
                    'subtype' => $movement->type,
                    'quantity_change' => $movement->quantity,
                    'stock_balance' => $movement->current_stock_balance,
                    'unit_price' => $movement->unit_price_snapshot,
                    'sale_price' => $movement->sale_price_snapshot,
                    'branch' => $movement->branch ? $movement->branch->description : 'N/A',
                    'branch_id' => $movement->branch_id,
                    'user' => $movement->user ? $movement->user->full_name : 'System',
                    'user_id' => $movement->user_id,
                    'reference' => $this->formatReference($movement->reference),
                    'notes' => $movement->notes,
                ];
            });

        // 2. Get Cost History (For price changes that didn't involve movement logic)
        $costHistory = ProductCostHistory::with(['user'])
            ->where('product_id', $productId)
            ->get()
            ->map(function ($history) {
                return [
                    'id' => 'cost-' . $history->id,
                    'date' => $history->created_at->toIso8601String(),
                    'type' => 'price_change',
                    'subtype' => $history->source_type ?? 'manual_update',
                    'quantity_change' => 0,
                    'stock_balance' => null,
                    'unit_price' => $history->new_cost,
                    'old_unit_price' => $history->previous_cost,
                    'branch' => 'Global',
                    'branch_id' => null,
                    'user' => $history->user ? $history->user->full_name : 'System',
                    'user_id' => $history->user_id,
                    'notes' => $history->notes,
                ];
            });

        // 3. Combine and Sort
        $timeline = $movements->concat($costHistory)
            ->sortByDesc('date')
            ->values();

        // Calculate current stock based on branches
        $stocksQuery = $product->stocks();
        if ($branchIds) {
            $stocksQuery->whereIn('branch_id', $branchIds);
        }

        return response()->json([
            'product' => [
                'id' => $product->id,
                'description' => $product->description,
                'code' => $product->code,
                'current_stock' => $stocksQuery->sum('current_stock'),
                'current_price' => $product->unit_price,
                'current_sale_price' => $product->sale_price,
            ],
            'timeline' => $timeline
        ]);
    }

    private function formatReference($reference)
    {
        if (!$reference)
            return null;

        $type = class_basename($reference);

        switch ($type) {
            case 'SaleHeader':
                return [
                    'type' => 'Venta',
                    'id' => $reference->id,
                    'label' => 'Venta #' . $reference->id
                ];
            case 'PurchaseOrder':
                return [
                    'type' => 'Compra',
                    'id' => $reference->id,
                    'label' => 'Orden de Compra #' . $reference->id
                ];
            case 'StockTransfer':
                return [
                    'type' => 'Transferencia',
                    'id' => $reference->id,
                    'label' => 'Transferencia #' . $reference->id
                ];
            default:
                return [
                    'type' => $type,
                    'id' => $reference->id,
                    'label' => $type . ' #' . $reference->id
                ];
        }
    }
}
