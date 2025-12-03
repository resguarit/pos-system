<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface StockTransferServiceInterface
{
    /**
     * Get all stock transfers with optional filters
     */
    public function getAllStockTransfers(Request $request);

    /**
     * Get a stock transfer by ID
     */
    public function getStockTransferById($id);

    /**
     * Create a new stock transfer
     */
    public function createStockTransfer(array $data);

    /**
     * Update an existing stock transfer
     */
    public function updateStockTransfer($id, array $data);

    /**
     * Delete a stock transfer
     */
    public function deleteStockTransfer($id);

    /**
     * Complete a stock transfer (transfer stock between branches)
     */
    public function completeStockTransfer($id);

    /**
     * Cancel a stock transfer
     */
    public function cancelStockTransfer($id);
}
