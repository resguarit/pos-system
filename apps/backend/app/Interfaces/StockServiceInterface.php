<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface StockServiceInterface
{
    public function getAllStocks(Request $request);
    
    public function getStockById($id);
    
    public function getStockByProductAndBranch($productId, $branchId);
    
    public function createStock(array $data);
    
    public function updateStock($id, array $data);
    
    public function deleteStock($id);

    public function updateStockQuantity($id, $quantity);

    public function reduceStockByProductAndBranch($productId, $branchId, $quantity);
}