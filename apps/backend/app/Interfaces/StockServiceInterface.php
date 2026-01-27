<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface StockServiceInterface
{
    public function getAllStocks(Request $request);

    public function getStockById($id);

    public function getStockByProductAndBranch($productId, $branchId);

    public function createStock(array $data, $type = 'Initial', $reference = null, $notes = null);

    public function updateStock($id, array $data, $type = 'adjustment', $reference = null, $notes = null);

    public function deleteStock($id);

    public function updateStockQuantity($id, $quantity, $type = 'adjustment', $reference = null, $notes = null);

    public function reduceStockByProductAndBranch($productId, $branchId, $quantity, $type = 'sale', $reference = null, $notes = null, $allowNegative = true);

    public function increaseStockByProductAndBranch($productId, $branchId, $quantity, $type = 'purchase', $reference = null, $notes = null);
}