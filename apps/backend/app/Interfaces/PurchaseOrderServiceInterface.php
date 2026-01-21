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

    public function completePurchaseOrder($id, $paymentMethodId = null);

    public function cancelPurchaseOrder($id);

    /**
     * Get preview data for cancelling a completed purchase order
     * Returns stock changes and cash movement info
     */
    public function getCancellationPreview($id);

    /**
     * Cancel a completed purchase order
     * Reverts stock, deletes cash movement, logs activity
     */
    public function cancelCompletedPurchaseOrder($id);
}