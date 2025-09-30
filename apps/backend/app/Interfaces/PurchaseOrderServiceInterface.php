<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface PurchaseOrderServiceInterface
{
    public function getAllPurchaseOrders(Request $request);
    
    public function getPurchaseOrderById($id);
    
    public function createPurchaseOrder(array $data);
    
    public function updatePurchaseOrder($id, array $data);
    
    public function deletePurchaseOrder($id);
    
    public function completePurchaseOrder($id);
    
    public function cancelPurchaseOrder($id);
}