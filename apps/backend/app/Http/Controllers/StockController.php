<?php

namespace App\Http\Controllers;

use App\Interfaces\StockServiceInterface;
use App\Models\Stock;
use App\Http\Requests\StoreStockRequest;
use App\Http\Requests\UpdateStockRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StockController extends Controller
{
    protected $stockService;

    public function __construct(StockServiceInterface $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Get all stocks, optionally filtered by request parameters.
     */
    public function index(Request $request) // Inject Request
    {
        // Pass the request to the service method
        $stocks = $this->stockService->getAllStocks($request);
        return response()->json([
            'status' => 'success',
            'data' => $stocks
        ], 200);
    }

    /**
     * Get stock by ID
     */
    public function show($id)
    {
        try {
            $stock = $this->stockService->getStockById($id);
            return response()->json([
                'status' => 'success',
                'data' => $stock
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stock not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Get stock by product and branch
     */
    public function getByProductAndBranch(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'branch_id' => 'required|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $stock = $this->stockService->getStockByProductAndBranch(
                $request->product_id,
                $request->branch_id
            );
            
            if (!$stock) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Stock not found for this product and branch'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $stock
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new stock
     */
    public function store(StoreStockRequest $request)
    {
        $validatedData = $request->validated();
        $stock = Stock::create($validatedData); // Aquí creas el stock
        return response()->json($stock, 201);
    }

    /**
     * Update an existing stock
     */
    public function update(UpdateStockRequest $request, Stock $stock) // Type-hint y Route Model Binding
    {
        $validatedData = $request->validated();
        // Lógica para actualizar el stock usando $validatedData
        $stock->update($validatedData);
        // ...
        return response()->json($stock);
    }

    /**
     * Update stock quantity
     */
    public function updateQuantity(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $stock = $this->stockService->updateStockQuantity(
                $id, 
                $request->quantity
            );
            
            return response()->json([
                'status' => 'success',
                'message' => 'Stock quantity updated successfully',
                'data' => $stock
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stock not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Reduce stock for multiple products
     */
    public function reduceStock(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'stock_updates' => 'required|array|min:1',
            'stock_updates.*.product_id' => 'required|exists:products,id',
            'stock_updates.*.quantity_sold' => 'required|numeric|min:0.01',
            'branch_id' => 'required|exists:branches,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $results = [];
            $errors = [];

            foreach ($request->stock_updates as $update) {
                try {
                    $stock = $this->stockService->reduceStockByProductAndBranch(
                        $update['product_id'],
                        $request->branch_id,
                        $update['quantity_sold']
                    );
                    $results[] = [
                        'product_id' => $update['product_id'],
                        'quantity_sold' => $update['quantity_sold'],
                        'remaining_stock' => $stock->current_stock,
                        'status' => 'success'
                    ];
                } catch (\Exception $e) {
                    $errors[] = [
                        'product_id' => $update['product_id'],
                        'quantity_sold' => $update['quantity_sold'],
                        'error' => $e->getMessage(),
                        'status' => 'error'
                    ];
                }
            }

            $response = [
                'status' => empty($errors) ? 'success' : 'partial_success',
                'message' => empty($errors) ? 'All stock reduced successfully' : 'Some stock reductions failed',
                'successful_updates' => $results,
                'failed_updates' => $errors
            ];

            return response()->json($response, empty($errors) ? 200 : 207);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error reducing stock',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Delete a stock
     */
    public function destroy($id)
    {
        try {
            $this->stockService->deleteStock($id);
            return response()->json([
                'status' => 'success',
                'message' => 'Stock deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stock not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}