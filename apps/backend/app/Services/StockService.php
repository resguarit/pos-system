<?php

namespace App\Services;

use App\Models\Stock;
use App\Interfaces\StockServiceInterface;
use Illuminate\Http\Request; // Add this line

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
    
    public function createStock(array $data)
    {
        return Stock::create($data);
    }
    
    public function updateStock($id, array $data)
    {
        $stock = Stock::findOrFail($id);
        $stock->update($data);
        return $stock;
    }
    
    public function deleteStock($id)
    {
        $stock = Stock::findOrFail($id);
        $stock->delete();
        return $stock;
    }

    public function updateStockQuantity($id, $quantity)
    {
        $stock = Stock::findOrFail($id);
        $stock->current_stock = $quantity;
        $stock->save();
        
        return $stock;
    }

    /**
     * Reduce stock by product and branch
     */
    public function reduceStockByProductAndBranch($productId, $branchId, $quantity)
    {
        // Debug para ver qué cantidad se está pasando
        \Illuminate\Support\Facades\Log::info('Stock reduction debug', [
            'product_id' => $productId,
            'branch_id' => $branchId,
            'quantity_to_reduce' => $quantity,
            'quantity_type' => gettype($quantity),
        ]);

        // Allow negative stock and auto-create the stock row if missing
        $stock = Stock::firstOrCreate(
            [
                'product_id' => $productId,
                'branch_id' => $branchId,
            ],
            [
                'current_stock' => 0,
            ]
        );

        $originalStock = $stock->current_stock;
        $stock->current_stock = ((float) $stock->current_stock) - ((float) $quantity);
        $stock->save();
        
        // Debug del resultado
        \Illuminate\Support\Facades\Log::info('Stock reduction result', [
            'product_id' => $productId,
            'original_stock' => $originalStock,
            'quantity_reduced' => $quantity,
            'new_stock' => $stock->current_stock,
        ]);
        
        return $stock;
    }
}