<?php

namespace App\Services;

use App\Interfaces\ProductServiceInterface;
use App\Models\Product;
use App\Models\Category;
use App\Models\Iva;
use App\Models\Measure;
use App\Models\Supplier;
use App\Models\Stock;
use App\Models\Branch;
use App\Services\ProductCostHistoryService;
use App\Constants\ProductCostHistorySourceTypes;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProductService implements ProductServiceInterface
{
    /**
     * Helper method para recalcular el precio de venta
     */
    private function recalculateSalePrice($product)
    {
        try {
            $pricingService = app(\App\Services\PricingService::class);

            // Obtener el IVA rate como decimal
            $ivaRate = null;
            if ($product->iva_id) {
                $iva = \App\Models\Iva::find($product->iva_id);
                $ivaRate = $iva ? $iva->rate / 100 : null;
            }

            // Calcular el nuevo precio de venta usando el markup actual
            $newSalePrice = $pricingService->calculateSalePrice(
                (float) $product->unit_price,
                $product->currency,
                (float) $product->markup,
                $ivaRate
            );

            // Actualizar solo el sale_price sin disparar eventos adicionales
            $product->setAttribute('sale_price', $newSalePrice);
            $product->saveQuietly(); // Usar saveQuietly para evitar loops
        } catch (Exception $e) {
            Log::error("Error recalculando precio de venta para producto {$product->id}: " . $e->getMessage());
            // No lanzar excepción para no interrumpir el proceso
        }
    }

    public function getAllProducts()
    {
        try {
            return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])
                ->where('status', true) // Solo productos activos
                ->get();
        } catch (Exception $e) {
            Log::error('Error fetching all products: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function getAllProductsForAdmin()
    {
        try {
            return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])->get();
        } catch (Exception $e) {
            Log::error('Error fetching all products for admin: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function getPaginatedProducts(array $filters, int $perPage = 50)
    {
        try {
            $query = Product::with(['measure', 'category', 'iva', 'supplier'])
                ->where('status', true); // Default to active products, can be overridden by filter if needed

            // --- Apply Filters ---

            // 1. Search (Code, Description, Category)
            if (!empty($filters['search'])) {
                $search = $filters['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'LIKE', "%{$search}%")
                        ->orWhere('description', 'LIKE', "%{$search}%")
                        ->orWhereHas('category', function ($catQ) use ($search) {
                            $catQ->where('name', 'LIKE', "%{$search}%");
                        });
                });
            }

            // 2. Categories
            if (!empty($filters['category_ids'])) {
                $query->whereIn('category_id', $filters['category_ids']);
            }

            // 3. Suppliers (if needed, though not explicitly requested in plan, good to have)
            if (!empty($filters['supplier_ids'])) {
                $query->whereIn('supplier_id', $filters['supplier_ids']);
            }

            // 4. Branches (Filter stocks relation AND filter products by existence in branch if strict)
            // Logic: Users usually want to see products available in selected branch.
            // Also, we need to filter the EAGER LOADED stocks to only show relevant ones in the UI.
            $branchIds = $filters['branch_ids'] ?? [];

            if (!empty($branchIds)) {
                $query->with([
                    'stocks' => function ($q) use ($branchIds) {
                        $q->whereIn('branch_id', $branchIds);
                    }
                ]);

                // Optional: Hide products that have NO stock record in the selected branch at all?
                // Usually we just show them with 0 stock. 
                // But we can use whereHas to ensure they are linked to the branch if that's the business rule.
                // For now, we just filter the relation so the UI calculates correctly.

            } else {
                $query->with('stocks');
            }

            // 5. Currency
            if (!empty($filters['currency'])) {
                $query->where('currency', $filters['currency']);
            }

            // 6. Stock Status (Complex)
            // 'in-stock', 'low-stock', 'out-of-stock'
            if (!empty($filters['stock_status'])) {
                // We need to calculate aggregate stock for the context (selected branches or all)
                // and then filter by it.
                // Using subqueries to avoid groupBy issues with pagination.

                $query->where(function ($q) use ($filters, $branchIds) {
                    $statuses = $filters['stock_status'];

                    // Helper to build the stock sum subquery
                    $buildStockSumQuery = function ($column) use ($branchIds) {
                        return DB::table('stocks')
                            ->selectRaw("COALESCE(SUM($column), 0)")
                            ->whereColumn('stocks.product_id', 'products.id')
                            ->when(!empty($branchIds), function ($sq) use ($branchIds) {
                                $sq->whereIn('branch_id', $branchIds);
                            });
                    };

                    foreach ($statuses as $status) {
                        $q->orWhere(function ($subQ) use ($status, $buildStockSumQuery) {
                            $currentStockSql = $buildStockSumQuery('current_stock')->toSql();
                            $minStockSql = $buildStockSumQuery('min_stock')->toSql();
                            // We need to bind parameters if branchIds are used, but toSql() doesn't include bindings.
                            // Laravel's whereRaw handles bindings if passed.
                            // However, mixing subqueries with bindings in whereRaw is tricky.
                            // Let's use cleaner whereRaw with the subquery string logic carefully?
                            // Actually, Laravel 8/9+ supports filter via `where(function($q) { ... })` effectively.
                            // Let's use `whereRaw` with subqueries directly injected if possible, or `whereHas` logic.

                            // Alternative: Recalculate logic. 
                            // Out of Stock: SUM(current) <= 0
                            // Low Stock: SUM(current) > 0 AND SUM(current) <= SUM(min)
                            // In Stock: SUM(current) > SUM(min)

                            // To do this safely with bindings, we can use `whereRaw`.
                            // But getting the bindings right for the subquery inside whereRaw is hard.
                            // Simplified approach: Add select subqueries and use `having`? No, having breaks pagination count.

                            // Let's use `whereExists` or logic that doesn't require aggregate comparison in the WHERE directly if possible? No.

                            // Best approach for Laravel: use `whereRaw` with robust subquery generation.

                            $bindings = [];
                            if (!empty($branchIds)) {
                                // Add bindings for both current and min subqueries if needed
                                // But since we are inside a loop, it's messy.
                            }

                            // Let's try to construct the SQL string for the subquery.
                            $branchCondition = "";
                            if (!empty($branchIds)) {
                                $ids = implode(',', array_map('intval', $branchIds));
                                $branchCondition = "AND branch_id IN ($ids)";
                            }

                            $sumCurrent = "(SELECT COALESCE(SUM(current_stock), 0) FROM stocks WHERE stocks.product_id = products.id $branchCondition)";
                            $sumMin = "(SELECT COALESCE(SUM(min_stock), 0) FROM stocks WHERE stocks.product_id = products.id $branchCondition)";

                            if ($status === 'out-of-stock') {
                                $subQ->whereRaw("$sumCurrent <= 0");
                            } elseif ($status === 'low-stock') {
                                $subQ->whereRaw("$sumCurrent > 0 AND $sumCurrent <= $sumMin");
                            } elseif ($status === 'in-stock') {
                                $subQ->whereRaw("$sumCurrent > $sumMin");
                            }
                        });
                    }
                });
            }

            // Ordering
            if (!empty($filters['search'])) {
                $query->orderBy('description', 'asc');
            } else {
                $query->orderBy('created_at', 'desc');
            }

            return $query->paginate($perPage);

        } catch (Exception $e) {
            Log::error('Error fetching paginated products: ' . $e->getMessage(), [
                'filters' => $filters,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function createProduct(array $data)
    {
        // Validar y corregir markup negativo antes de crear
        if (isset($data['markup']) && $data['markup'] < 0) {
            Log::warning("ProductService::createProduct - Markup negativo detectado: {$data['markup']}, corrigiendo a 0");
            $data['markup'] = 0.0;
        }

        // Crear el producto
        $product = Product::create($data);

        // Crear stock automáticamente
        if (isset($data['branch_ids']) && is_array($data['branch_ids']) && !empty($data['branch_ids'])) {
            // Crear stock en sucursales específicas
            foreach ($data['branch_ids'] as $branchId) {
                Stock::create([
                    'product_id' => $product->id,
                    'branch_id' => $branchId,
                    'current_stock' => 0,
                    'min_stock' => $data['min_stock'] ?? 0,
                    'max_stock' => $data['max_stock'] ?? 0
                ]);
            }
            unset($data['branch_ids']); // Remover del array para no guardarlo en el producto
            unset($data['min_stock']); // Remover del array para no guardarlo en el producto
            unset($data['max_stock']); // Remover del array para no guardarlo en el producto
        } elseif (isset($data['branch_id'])) {
            // Crear stock en una sola sucursal (compatibilidad)
            $branchId = $data['branch_id'];
            unset($data['branch_id']); // Remover del array para no guardarlo en el producto

            Stock::create([
                'product_id' => $product->id,
                'branch_id' => $branchId,
                'current_stock' => 0,
                'min_stock' => $data['min_stock'] ?? 0,
                'max_stock' => $data['max_stock'] ?? 0
            ]);
        } else {
            // Crear stock en todas las sucursales activas
            $branches = Branch::where('status', 1)->get();
            foreach ($branches as $branch) {
                Stock::create([
                    'product_id' => $product->id,
                    'branch_id' => $branch->id,
                    'current_stock' => 0,
                    'min_stock' => $data['min_stock'] ?? 0,
                    'max_stock' => $data['max_stock'] ?? 0
                ]);
            }
        }

        // Registrar historial de costo inicial
        if (isset($data['unit_price'])) {
            try {
                $costHistoryService = app(ProductCostHistoryService::class);
                $costHistoryService->recordCostChange(
                    $product,
                    (float) $data['unit_price'],
                    ProductCostHistorySourceTypes::IMPORT,
                    null,
                    'Costo inicial',
                    0 // Previous cost explicitly 0 for initial creation
                );
            } catch (Exception $e) {
                // Try to log, but don't crash if logging fails (e.g. permission denied)
                try {
                    Log::error("Error registrando historial de costo inicial para producto {$product->id}: " . $e->getMessage());
                } catch (Exception $logEx) {
                    // Silently ignore logging failures to ensure product creation succeeds
                }
            }
        }

        return $product;
    }

    public function getProductById($id)
    {
        return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])->findOrFail($id);
    }

    public function updateProduct($id, array $data, bool $skipCostHistory = false)
    {
        $product = Product::findOrFail($id);

        // Guardar el costo anterior antes de actualizar
        $previousCost = $product->unit_price;
        $costChanged = isset($data['unit_price']) && (float) $previousCost !== (float) $data['unit_price'];

        // Separar los datos de stock de los datos del producto
        $stockData = [];
        if (isset($data['min_stock'])) {
            $stockData['min_stock'] = $data['min_stock'];
            unset($data['min_stock']);
        }
        if (isset($data['max_stock'])) {
            $stockData['max_stock'] = $data['max_stock'];
            unset($data['max_stock']);
        }

        // Validar y corregir markup negativo antes de guardar
        if (isset($data['markup']) && $data['markup'] < 0) {
            try {
                Log::warning("ProductService::updateProduct - Markup negativo detectado: {$data['markup']}, corrigiendo a 0");
            } catch (\Exception $e) {
            }
            $data['markup'] = 0.0;
        }

        // Actualizar los campos del producto
        foreach ($data as $key => $value) {
            // Validar markup antes de asignar
            if ($key === 'markup' && $value < 0) {
                try {
                    Log::warning("ProductService::updateProduct - Markup negativo detectado en campo: {$value}, corrigiendo a 0");
                } catch (\Exception $e) {
                }
                $value = 0.0;
            }
            $product->$key = $value;
        }
        $product->save();

        // Actualizar o crear stocks en todas las sucursales
        if (!empty($stockData)) {
            $branches = Branch::all();
            foreach ($branches as $branch) {
                $stock = Stock::firstOrCreate(
                    [
                        'product_id' => $product->id,
                        'branch_id' => $branch->id
                    ],
                    [
                        'current_stock' => 0,
                        'min_stock' => $stockData['min_stock'] ?? 0,
                        'max_stock' => $stockData['max_stock'] ?? 0
                    ]
                );

                // Si ya existe, actualizar solo los campos min/max
                if (!$stock->wasRecentlyCreated) {
                    $needsUpdate = false;
                    if (array_key_exists('min_stock', $stockData)) {
                        $stock->min_stock = $stockData['min_stock'];
                        $needsUpdate = true;
                    }
                    if (array_key_exists('max_stock', $stockData)) {
                        $stock->max_stock = $stockData['max_stock'];
                        $needsUpdate = true;
                    }

                    if ($needsUpdate) {
                        $stock->save();
                    }
                }
            }
        }

        $product->refresh();

        // Registrar historial de costo si cambió y no se debe omitir
        if ($costChanged && isset($data['unit_price']) && !$skipCostHistory) {
            try {
                $costHistoryService = app(ProductCostHistoryService::class);
                $costHistoryService->recordCostChange(
                    $product,
                    (float) $data['unit_price'],
                    ProductCostHistorySourceTypes::MANUAL,
                    null,
                    'Actualización manual del costo',
                    $previousCost
                );
            } catch (\Exception $e) {
                try {
                    Log::error("Error registrando historial de costo para producto {$product->id}: " . $e->getMessage());
                } catch (\Exception $logEx) {
                }
            }
        }

        return $product;
    }

    public function deleteProduct($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return $product;
    }

    public function getAllCategories()
    {
        // Para productos, es mejor obtener las categorías con estructura jerárquica
        return Category::with(['parent', 'children'])->get();
    }

    public function getAllIvas()
    {
        return Iva::all();
    }

    public function getAllMeasures()
    {
        return Measure::all();
    }

    public function getAllSuppliers()
    {
        return Supplier::all();
    }

    public function getAllBranches()
    {
        return Branch::all();
    }

    public function bulkUpdatePrices(array $updates)
    {
        return DB::transaction(function () use ($updates) {
            $updatedCount = 0;
            $failedUpdates = [];

            foreach ($updates as $update) {
                try {
                    $product = Product::findOrFail($update['id']);
                    $oldPrice = $product->unit_price;

                    // Actualizar el precio unitario
                    $product->update([
                        'unit_price' => $update['unit_price']
                    ]);

                    // Recalcular el precio de venta
                    $this->recalculateSalePrice($product);

                    // Registrar historial de costo
                    try {
                        $costHistoryService = app(ProductCostHistoryService::class);
                        $costHistoryService->recordCostChange(
                            $product,
                            (float) $update['unit_price'],
                            ProductCostHistorySourceTypes::BULK_UPDATE,
                            null,
                            'Actualización masiva de precios',
                            $oldPrice // Pasar el costo anterior explícitamente
                        );
                    } catch (Exception $e) {
                        Log::error("Error registrando historial de costo en bulk update para producto {$product->id}: " . $e->getMessage());
                    }

                    Log::info('Bulk price update', [
                        'product_id' => $product->id,
                        'product_description' => $product->description,
                        'old_price' => $oldPrice,
                        'new_price' => $update['unit_price'],
                        'new_sale_price' => $product->sale_price,
                        'currency' => $product->currency
                    ]);

                    $updatedCount++;
                } catch (Exception $e) {
                    $failedUpdates[] = [
                        'product_id' => $update['id'],
                        'error' => $e->getMessage()
                    ];

                    Log::error('Failed bulk price update', [
                        'product_id' => $update['id'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'failed_updates' => $failedUpdates,
                'message' => "Se actualizaron {$updatedCount} productos correctamente"
            ];
        });
    }

    public function bulkUpdatePricesByCategory(array $categoryIds, string $updateType, float $value)
    {
        return DB::transaction(function () use ($categoryIds, $updateType, $value) {
            $products = Product::whereIn('category_id', $categoryIds)->get();

            if ($products->isEmpty()) {
                throw new Exception('No se encontraron productos en las categorías seleccionadas');
            }

            foreach ($products as $product) {
                $oldPrice = $product->unit_price;
                $newPrice = $this->calculateNewPrice($oldPrice, $updateType, $value);

                // Actualizar el precio unitario
                $product->update([
                    'unit_price' => $newPrice
                ]);

                // Recalcular el precio de venta
                $this->recalculateSalePrice($product);

                // Registrar historial de costo
                try {
                    $costHistoryService = app(ProductCostHistoryService::class);
                    $costHistoryService->recordCostChange(
                        $product,
                        (float) $newPrice,
                        ProductCostHistorySourceTypes::BULK_UPDATE_BY_CATEGORY,
                        null,
                        "Actualización masiva por categoría: {$updateType} {$value}",
                        $oldPrice // Pasar el costo anterior explícitamente
                    );
                } catch (Exception $e) {
                    Log::error("Error registrando historial de costo en bulk update por categoría para producto {$product->id}: " . $e->getMessage());
                }

                Log::info('Bulk category price update', [
                    'product_id' => $product->id,
                    'product_description' => $product->description,
                    'category_id' => $product->category_id,
                    'update_type' => $updateType,
                    'value' => $value,
                    'old_price' => $oldPrice,
                    'new_price' => $newPrice,
                    'new_sale_price' => $product->sale_price,
                    'currency' => $product->currency
                ]);
            }

            return [
                'success' => true,
                'updated_count' => $products->count(),
                'message' => "Se actualizaron {$products->count()} productos de las categorías seleccionadas"
            ];
        });
    }

    public function bulkUpdatePricesBySupplier(array $supplierIds, string $updateType, float $value)
    {
        return DB::transaction(function () use ($supplierIds, $updateType, $value) {
            $products = Product::whereIn('supplier_id', $supplierIds)->where('status', true)->get();

            if ($products->isEmpty()) {
                throw new Exception('No se encontraron productos para los proveedores especificados');
            }

            $updatedCount = 0;
            foreach ($products as $product) {
                $oldPrice = $product->unit_price;
                $newPrice = $this->calculateNewPrice($oldPrice, $updateType, $value);

                // Actualizar el precio unitario
                $product->update(['unit_price' => $newPrice]);

                // Recalcular el precio de venta
                $this->recalculateSalePrice($product);

                // Registrar historial de costo
                try {
                    $costHistoryService = app(ProductCostHistoryService::class);
                    $costHistoryService->recordCostChange(
                        $product,
                        (float) $newPrice,
                        ProductCostHistorySourceTypes::BULK_UPDATE_BY_SUPPLIER,
                        null,
                        "Actualización masiva por proveedor: {$updateType} {$value}",
                        $oldPrice // Pasar el costo anterior explícitamente
                    );
                } catch (Exception $e) {
                    Log::error("Error registrando historial de costo en bulk update por proveedor para producto {$product->id}: " . $e->getMessage());
                }

                $updatedCount++;
            }

            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'message' => "Se actualizaron {$updatedCount} productos correctamente"
            ];
        });
    }

    private function calculateNewPrice($currentPrice, $updateType, $value)
    {
        switch ($updateType) {
            case 'percentage':
                return $currentPrice * (1 + $value / 100);
            case 'fixed':
                return $currentPrice + $value;
            default:
                return $currentPrice;
        }
    }
}
