<?php

namespace App\Services;

use App\Models\Stock;
use App\Interfaces\StockServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;

class StockService implements StockServiceInterface
{
    public function getAllStocks(Request $request) // Add Request $request parameter
    {
        $query = Stock::with(['branch', 'product']);

        // Check if product_id is present in the request and filter
        if ($request->has('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        // Check if branch_id is present in the request and filter
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        return $query->get();
    }

    public function getStockById($id)
    {
        return Stock::with(['branch', 'product'])->findOrFail($id);
    }

    public function getStockByProductAndBranch($productId, $branchId)
    {
        return Stock::where('product_id', $productId)
            ->where('branch_id', $branchId)
            ->with(['branch', 'product'])
            ->first();
    }

    public function createStock(array $data, $type = 'Initial', $reference = null, $notes = null)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($data, $type, $reference, $notes) {
            $stock = Stock::create($data);

            if (isset($data['current_stock']) && $data['current_stock'] != 0) {
                $this->logMovement($stock, $data['current_stock'], $type, $reference, $notes);
            }

            return $stock;
        });
    }

    public function updateStock($id, array $data, $type = 'adjustment', $reference = null, $notes = null)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($id, $data, $type, $reference, $notes) {
            $stock = Stock::where('id', $id)->lockForUpdate()->firstOrFail();
            $oldQuantity = $stock->current_stock;

            $stock->update($data);

            if (isset($data['current_stock'])) {
                $newQuantity = $stock->current_stock;
                $diff = $newQuantity - $oldQuantity;

                if ($diff != 0) {
                    $this->logMovement($stock, $diff, $type, $reference, $notes);
                }
            }

            return $stock;
        });
    }

    public function deleteStock($id)
    {
        $stock = Stock::findOrFail($id);
        $stock->delete();
        return $stock;
    }

    /**
     * Reduce stock by product and branch.
     * Uses lockForUpdate + transaction.
     * Si $allowNegative es false (ej. transferencias), lanza cuando el origen quedaría negativo.
     */
    public function reduceStockByProductAndBranch($productId, $branchId, $quantity, $type = 'sale', $reference = null, $notes = null, $allowNegative = true)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($productId, $branchId, $quantity, $type, $reference, $notes, $allowNegative) {
            $stock = $this->getOrCreateStockLocked($productId, $branchId);

            $newStock = ((float) $stock->current_stock) - ((float) $quantity);

            if (!$allowNegative && $newStock < 0) {
                throw new \RuntimeException(
                    "Stock insuficiente en origen para transferencia. Disponible: {$stock->current_stock}, Requerido: {$quantity}."
                );
            }

            $stock->current_stock = $newStock;
            $stock->save();

            $this->logMovement($stock, -$quantity, $type, $reference, $notes);

            return $stock;
        });
    }

    /**
     * Increase stock by product and branch.
     * Uses lockForUpdate + transaction.
     */
    public function increaseStockByProductAndBranch($productId, $branchId, $quantity, $type = 'purchase', $reference = null, $notes = null)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($productId, $branchId, $quantity, $type, $reference, $notes) {
            $stock = $this->getOrCreateStockLocked($productId, $branchId);

            $stock->current_stock = ((float) $stock->current_stock) + ((float) $quantity);
            $stock->save();

            $this->logMovement($stock, $quantity, $type, $reference, $notes);

            return $stock;
        });
    }

    /**
     * Get stock row locked for update, or create it. Handles unique constraint race.
     * Must be called inside an existing DB transaction.
     *
     * @return Stock
     */
    private function getOrCreateStockLocked(int $productId, int $branchId): Stock
    {
        $stock = Stock::where('product_id', $productId)
            ->where('branch_id', $branchId)
            ->lockForUpdate()
            ->first();

        if ($stock) {
            return $stock;
        }

        try {
            Stock::create([
                'product_id' => $productId,
                'branch_id' => $branchId,
                'current_stock' => 0,
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() !== '23000' && strpos($e->getMessage(), 'Duplicate') === false) {
                throw $e;
            }
            // Otro proceso creó la fila; obtenerla con lock
            $stock = Stock::where('product_id', $productId)
                ->where('branch_id', $branchId)
                ->lockForUpdate()
                ->first();
            if (!$stock) {
                throw $e;
            }
            return $stock;
        }

        return Stock::where('product_id', $productId)
            ->where('branch_id', $branchId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    public function updateStockQuantity($id, $quantity, $type = 'adjustment', $reference = null, $notes = null)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($id, $quantity, $type, $reference, $notes) {
            // Use lockForUpdate to prevent race conditions
            $stock = Stock::where('id', $id)->lockForUpdate()->firstOrFail();

            $oldQuantity = $stock->current_stock;
            $diff = $quantity - $oldQuantity;

            $stock->current_stock = $quantity;
            $stock->save();

            if ($diff != 0) {
                $this->logMovement($stock, $diff, $type, $reference, $notes);
            }

            return $stock;
        });
    }

    private function logMovement(Stock $stock, $quantityChange, $type, $reference = null, $notes = null)
    {
        try {
            $product = $stock->product; // Ensure product relation is loaded or load it
            if (!$product) {
                $product = \App\Models\Product::find($stock->product_id);
            }

            $movement = new \App\Models\StockMovement();
            $movement->product_id = $stock->product_id;
            $movement->branch_id = $stock->branch_id;
            $movement->quantity = $quantityChange;
            $movement->type = $type;
            $movement->user_id = auth()->id();
            $movement->current_stock_balance = $stock->current_stock;
            $movement->unit_price_snapshot = $product ? $product->unit_price : 0;
            $movement->sale_price_snapshot = $product ? $product->sale_price : 0;
            $movement->notes = $notes;

            if ($reference) {
                $movement->reference()->associate($reference);
            }

            $movement->save();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error logging stock movement: ' . $e->getMessage());
        }
    }
}