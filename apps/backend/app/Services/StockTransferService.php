<?php

namespace App\Services;

use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Product;
use App\Interfaces\StockTransferServiceInterface;
use App\Interfaces\StockServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class StockTransferService implements StockTransferServiceInterface
{
    protected $stockService;

    public function __construct(StockServiceInterface $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Get user's branch IDs for access control
     * 
     * @return array
     */
    private function getUserBranchIds(): array
    {
        $user = auth()->user();
        if (!$user) {
            return [];
        }
        
        return $user->branches()->pluck('branches.id')->toArray();
    }

    /**
     * Check if user has access to a transfer
     * 
     * @param StockTransfer $transfer
     * @return bool
     */
    private function hasAccessToTransfer(StockTransfer $transfer): bool
    {
        $userBranchIds = $this->getUserBranchIds();
        
        if (empty($userBranchIds)) {
            return true; // No restrictions if no branches assigned
        }
        
        return in_array($transfer->source_branch_id, $userBranchIds) 
            || in_array($transfer->destination_branch_id, $userBranchIds);
    }

    public function getAllStockTransfers(Request $request)
    {
        $query = StockTransfer::with(['sourceBranch', 'destinationBranch', 'items.product', 'user']);

        // Filter by user's assigned branches
        $userBranchIds = $this->getUserBranchIds();
        if (!empty($userBranchIds)) {
            $query->where(function ($q) use ($userBranchIds) {
                $q->whereIn('source_branch_id', $userBranchIds)
                  ->orWhereIn('destination_branch_id', $userBranchIds);
            });
        }

        if ($request->has('source_branch_id')) {
            $query->where('source_branch_id', $request->input('source_branch_id'));
        }

        if ($request->has('destination_branch_id')) {
            $query->where('destination_branch_id', $request->input('destination_branch_id'));
        }

        if ($request->has('branch_id')) {
            $query->forBranch($request->input('branch_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('from') && $request->from) {
            $query->whereDate('transfer_date', '>=', $request->from);
        }

        if ($request->has('to') && $request->to) {
            $query->whereDate('transfer_date', '<=', $request->to);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getStockTransferById($id)
    {
        $transfer = StockTransfer::with(['sourceBranch', 'destinationBranch', 'items.product', 'user'])->findOrFail($id);
        
        // Verify user has access to this transfer (through source or destination branch)
        if (!$this->hasAccessToTransfer($transfer)) {
            throw new Exception('No tienes acceso a esta transferencia');
        }
        
        return $transfer;
    }

    public function createStockTransfer(array $data)
    {
        DB::beginTransaction();

        try {
            // Validar que las sucursales sean diferentes
            if ($data['source_branch_id'] === $data['destination_branch_id']) {
                throw new Exception('Las sucursales de origen y destino deben ser diferentes');
            }

            $stockTransfer = StockTransfer::create([
                'source_branch_id' => $data['source_branch_id'],
                'destination_branch_id' => $data['destination_branch_id'],
                'transfer_date' => $data['transfer_date'] ?? now(),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'user_id' => auth()->id(),
            ]);

            foreach ($data['items'] as $itemData) {
                // Verificar que haya stock suficiente en la sucursal de origen
                $stock = $this->stockService->getStockByProductAndBranch(
                    $itemData['product_id'],
                    $data['source_branch_id']
                );

                if (!$stock || $stock->current_stock < $itemData['quantity']) {
                    $availableStock = $stock ? $stock->current_stock : 0;
                    $product = Product::find($itemData['product_id']);
                    $productName = $product ? $product->description : "ID {$itemData['product_id']}";
                    throw new Exception(
                        "Stock insuficiente para '{$productName}'. " .
                        "Disponible: {$availableStock}, Solicitado: {$itemData['quantity']}"
                    );
                }

                StockTransferItem::create([
                    'stock_transfer_id' => $stockTransfer->id,
                    'product_id' => $itemData['product_id'],
                    'quantity' => $itemData['quantity'],
                ]);
            }

            DB::commit();

            return $stockTransfer->fresh(['sourceBranch', 'destinationBranch', 'items.product', 'user']);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creando la transferencia de stock: " . $e->getMessage());
            throw $e;
        }
    }

    public function updateStockTransfer($id, array $data)
    {
        $stockTransfer = StockTransfer::with(['items'])->findOrFail($id);

        // Verify user has access to this transfer
        if (!$this->hasAccessToTransfer($stockTransfer)) {
            throw new Exception('No tienes acceso a esta transferencia');
        }

        if ($stockTransfer->status === 'completed') {
            throw new Exception('No se puede actualizar una transferencia completada');
        }

        DB::beginTransaction();
        try {
            // Validar que las sucursales sean diferentes
            $sourceBranchId = $data['source_branch_id'] ?? $stockTransfer->source_branch_id;
            $destinationBranchId = $data['destination_branch_id'] ?? $stockTransfer->destination_branch_id;

            if ($sourceBranchId === $destinationBranchId) {
                throw new Exception('Las sucursales de origen y destino deben ser diferentes');
            }

            // Actualizar cabecera
            $stockTransfer->source_branch_id = $sourceBranchId;
            $stockTransfer->destination_branch_id = $destinationBranchId;
            
            if (isset($data['transfer_date'])) {
                $stockTransfer->transfer_date = $data['transfer_date'];
            }
            
            if (array_key_exists('notes', $data)) {
                $stockTransfer->notes = $data['notes'];
            }
            
            $stockTransfer->save();

            // Upsert de ítems si vienen en la request
            if (isset($data['items']) && is_array($data['items'])) {
                $existingItems = $stockTransfer->items()->get()->keyBy('product_id');
                $incomingProductIds = [];

                foreach ($data['items'] as $itemData) {
                    $productId = (int)$itemData['product_id'];
                    $qty = (int)$itemData['quantity'];
                    $incomingProductIds[] = $productId;

                    // Verificar stock suficiente en la sucursal de origen
                    $stock = $this->stockService->getStockByProductAndBranch(
                        $productId,
                        $sourceBranchId
                    );

                    if (!$stock || $stock->current_stock < $qty) {
                        $availableStock = $stock ? $stock->current_stock : 0;
                        $product = Product::find($productId);
                        $productName = $product ? $product->description : "ID {$productId}";
                        throw new Exception(
                            "Stock insuficiente para '{$productName}'. " .
                            "Disponible: {$availableStock}, Solicitado: {$qty}"
                        );
                    }

                    // Upsert por product_id
                    if ($existingItems->has($productId)) {
                        $item = $existingItems->get($productId);
                        $item->quantity = $qty;
                        $item->save();
                    } else {
                        StockTransferItem::create([
                            'stock_transfer_id' => $stockTransfer->id,
                            'product_id' => $productId,
                            'quantity' => $qty,
                        ]);
                    }
                }

                // Eliminar ítems que ya no vienen
                $stockTransfer->items()
                    ->whereNotIn('product_id', $incomingProductIds)
                    ->delete();
            }

            DB::commit();
            return $stockTransfer->fresh(['sourceBranch', 'destinationBranch', 'items.product', 'user']);
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function deleteStockTransfer($id)
    {
        $stockTransfer = StockTransfer::findOrFail($id);
        
        if ($stockTransfer->status === 'completed') {
            throw new Exception('No se puede eliminar una transferencia completada');
        }

        $stockTransfer->delete();
        return $stockTransfer;
    }

    public function completeStockTransfer($id)
    {
        DB::beginTransaction();

        try {
            $stockTransfer = StockTransfer::with(['items.product', 'sourceBranch', 'destinationBranch'])
                ->findOrFail($id);

            // Verify user has access to this transfer
            if (!$this->hasAccessToTransfer($stockTransfer)) {
                throw new Exception('No tienes acceso a esta transferencia');
            }

            if ($stockTransfer->status === 'completed') {
                throw new Exception('La transferencia ya está completada');
            }

            if ($stockTransfer->status === 'cancelled') {
                throw new Exception('No se puede completar una transferencia cancelada');
            }

            // Transferir stock para cada item
            foreach ($stockTransfer->items as $item) {
                // Verificar stock suficiente en origen antes de transferir
                $sourceStock = $this->stockService->getStockByProductAndBranch(
                    $item->product_id,
                    $stockTransfer->source_branch_id
                );

                if (!$sourceStock || $sourceStock->current_stock < $item->quantity) {
                    $availableStock = $sourceStock ? $sourceStock->current_stock : 0;
                    throw new Exception(
                        "Stock insuficiente en sucursal de origen para el producto '{$item->product->description}'. " .
                        "Disponible: {$availableStock}, Requerido: {$item->quantity}"
                    );
                }

                // Restar stock de la sucursal de origen
                $this->updateStock(
                    $item->product_id,
                    $stockTransfer->source_branch_id,
                    -$item->quantity
                );

                // Sumar stock a la sucursal de destino
                $this->updateStock(
                    $item->product_id,
                    $stockTransfer->destination_branch_id,
                    $item->quantity
                );

                Log::info("Transferido producto {$item->product_id}: -{$item->quantity} de sucursal {$stockTransfer->source_branch_id}, +{$item->quantity} a sucursal {$stockTransfer->destination_branch_id}");
            }

            $stockTransfer->update(['status' => 'completed']);

            DB::commit();

            return $stockTransfer->fresh(['sourceBranch', 'destinationBranch', 'items.product']);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error completando transferencia de stock: " . $e->getMessage());
            throw $e;
        }
    }

    public function cancelStockTransfer($id)
    {
        $stockTransfer = StockTransfer::findOrFail($id);
        
        // Verify user has access to this transfer
        if (!$this->hasAccessToTransfer($stockTransfer)) {
            throw new Exception('No tienes acceso a esta transferencia');
        }
        
        if ($stockTransfer->status === 'completed') {
            throw new Exception('No se puede cancelar una transferencia completada');
        }

        $stockTransfer->update(['status' => 'cancelled']);
        return $stockTransfer;
    }

    /**
     * Actualizar stock de un producto en una sucursal
     * 
     * @param int $productId
     * @param int $branchId
     * @param int $quantityChange Puede ser positivo (sumar) o negativo (restar)
     */
    private function updateStock($productId, $branchId, $quantityChange)
    {
        $stock = $this->stockService->getStockByProductAndBranch($productId, $branchId);

        if ($stock) {
            $newQuantity = $stock->current_stock + $quantityChange;
            
            if ($newQuantity < 0) {
                throw new Exception("El stock no puede ser negativo. Stock actual: {$stock->current_stock}, Cambio: {$quantityChange}");
            }
            
            $this->stockService->updateStockQuantity($stock->id, $newQuantity);
        } else {
            // Si no existe el stock y queremos restar, error
            if ($quantityChange < 0) {
                throw new Exception("No existe stock para este producto en la sucursal");
            }
            
            // Si no existe y queremos sumar, crear nuevo registro
            $this->stockService->createStock([
                'product_id' => $productId,
                'branch_id' => $branchId,
                'current_stock' => $quantityChange,
                'min_stock' => 0,
                'max_stock' => 0,
            ]);
        }
    }
}
