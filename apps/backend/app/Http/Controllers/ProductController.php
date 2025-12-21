<?php

namespace App\Http\Controllers;

use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Product;

class ProductController extends Controller
{
    protected $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 50);

        // Extract filters
        $filters = [
            'search' => $request->query('search'),
            'category_ids' => $request->query('category_ids'), // Expecting array or comma-separated? usually array in Laravel query string: category_ids[]=1
            'supplier_ids' => $request->query('supplier_ids'),
            'branch_ids' => $request->query('branch_ids'),     // array
            'stock_status' => $request->query('stock_status')  // array
        ];

        // Handle comma-separated strings if passed that way (common in some frontends)
        if (is_string($filters['category_ids'])) {
            $filters['category_ids'] = explode(',', $filters['category_ids']);
        }
        if (is_string($filters['supplier_ids'])) {
            $filters['supplier_ids'] = explode(',', $filters['supplier_ids']);
        }
        if (is_string($filters['branch_ids'])) {
            $filters['branch_ids'] = explode(',', $filters['branch_ids']);
        }
        if (is_string($filters['stock_status'])) {
            $filters['stock_status'] = explode(',', $filters['stock_status']);
        }

        // If for_admin is passed, we might want to ensure we return everything or specific structure, 
        // but getPaginatedProducts handles the eager loading needed for admin view.

        return response()->json($this->productService->getPaginatedProducts($filters, $perPage));
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'description' => ['required', 'string', Rule::unique('products')->whereNull('deleted_at')],
            'code' => ['required', 'string', 'max:50', Rule::unique('products')->whereNull('deleted_at')],
            'measure_id' => 'nullable|integer|exists:measures,id',
            'unit_price' => 'required|numeric',
            'currency' => 'required|in:ARS,USD',
            'markup' => 'required|numeric',
            'sale_price' => 'nullable|numeric|min:0',
            'category_id' => 'required|integer',
            'iva_id' => 'required|integer',
            'image_id' => 'nullable|string',
            'supplier_id' => 'required|integer',
            'status' => 'required|boolean',
            'web' => 'required|boolean',
            'observaciones' => 'nullable|string',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
            'min_stock' => 'required|numeric|min:0',
            'max_stock' => 'required|numeric|min:1',
        ]);

        return response()->json($this->productService->createProduct($validatedData));
    }

    public function show($id)
    {
        return response()->json($this->productService->getProductById($id));
    }

    public function checkCode($code)
    {
        $exists = Product::where('code', $code)->whereNull('deleted_at')->exists();
        return response()->json(['exists' => $exists]);
    }

    public function checkDescription($description)
    {
        $exists = Product::where('description', $description)->whereNull('deleted_at')->exists();
        return response()->json(['exists' => $exists]);
    }

    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'description' => ['sometimes', 'required', 'string', Rule::unique('products')->ignore($id)->whereNull('deleted_at')],
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('products')->ignore($id)->whereNull('deleted_at')],
            'measure' => 'sometimes|required|string',
            'measure_id' => 'sometimes|nullable|integer|exists:measures,id',
            'unit_price' => 'sometimes|required|numeric',
            'currency' => 'sometimes|required|in:ARS,USD',
            'markup' => 'sometimes|required|numeric',
            'sale_price' => 'nullable|numeric|min:0',
            'category_id' => 'sometimes|required|integer',
            'iva_id' => 'sometimes|required|integer',
            'image_id' => 'nullable|string',
            'supplier_id' => 'sometimes|required|integer',
            'status' => 'sometimes|required|boolean',
            'web' => 'sometimes|required|boolean',
            'observaciones' => 'nullable|string',
        ]);

        return response()->json($this->productService->updateProduct($id, $validatedData));
    }

    public function destroy($id)
    {
        try {
            $product = Product::findOrFail($id);

            $product->delete();

            Log::info('Producto eliminado lógicamente', [
                'product_id' => $id,
                'product_description' => $product->description,
                'deleted_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Producto eliminado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error eliminando producto: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function bulkUpdatePrices(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'updates' => 'required|array|min:1',
                'updates.*.id' => 'required|integer|exists:products,id',
                'updates.*.unit_price' => 'required|numeric|min:0',
            ]);

            $result = $this->productService->bulkUpdatePrices($validatedData['updates']);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error en actualización masiva de precios: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar precios masivamente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function bulkUpdatePricesByCategory(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'category_ids' => 'required|array|min:1',
                'category_ids.*' => 'integer|exists:categories,id',
                'update_type' => 'required|in:percentage,fixed',
                'value' => 'required|numeric',
            ]);

            if ($validatedData['update_type'] === 'percentage' && ($validatedData['value'] < -100 || $validatedData['value'] > 1000)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El porcentaje debe estar entre -100% y 1000%'
                ], 400);
            }

            $result = $this->productService->bulkUpdatePricesByCategory(
                $validatedData['category_ids'],
                $validatedData['update_type'],
                $validatedData['value']
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error en actualización masiva por categoría: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar precios por categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getProductsByCategories(Request $request)
    {
        try {
            $request->validate([
                'category_ids' => 'required|array|min:1',
                'category_ids.*' => 'integer|exists:categories,id',
            ]);

            $categoryIds = $request->input('category_ids');

            $products = Product::with(['category'])
                ->whereIn('category_id', $categoryIds)
                ->orderBy('category_id')
                ->orderBy('description')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $products,
                'count' => $products->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo productos por categorías: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos por categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function exportPriceList(Request $request)
    {
        try {
            $categoryIds = $request->query('category_ids', []);
            $branchIds = $request->query('branch_ids', []);
            $includeInactive = $request->query('include_inactive', false);
            $includeOutOfStock = $request->query('include_out_of_stock', false);

            Log::info('Export Price List - Parámetros recibidos:', [
                'category_ids' => $categoryIds,
                'branch_ids' => $branchIds,
                'include_inactive' => $includeInactive,
                'include_out_of_stock' => $includeOutOfStock
            ]);

            $query = Product::with(['category']);

            if (!$includeInactive) {
                $query->where('status', true);
            }

            if (!empty($categoryIds)) {
                $query->whereIn('category_id', $categoryIds);
            }

            if (!empty($branchIds)) {
                $query->whereHas('stocks', function ($q) use ($branchIds, $includeOutOfStock) {
                    $q->whereIn('branch_id', $branchIds);
                    if (!$includeOutOfStock) {
                        $q->where('current_stock', '>', 0);
                    }
                });
            } elseif (!$includeOutOfStock) {
                $query->whereHas('stocks', function ($q) {
                    $q->where('current_stock', '>', 0);
                });
            }

            $products = $query->orderBy('category_id')
                ->orderBy('description')
                ->get();

            Log::info('Export Price List - Productos encontrados:', [
                'total_products' => $products->count()
            ]);

            foreach ($products->take(5) as $product) {
                Log::info('Producto debug:', [
                    'id' => $product->id,
                    'description' => $product->description,
                    'category_id' => $product->category_id,
                    'category_loaded' => $product->relationLoaded('category'),
                    'category_name' => $product->category ? $product->category->name : 'NULL'
                ]);
            }

            $productsByCategory = $products->groupBy(function ($product) {
                if ($product->category && $product->category->name) {
                    return $product->category->name;
                } else {
                    return 'Sin Categoría';
                }
            });

            Log::info('Export Price List - Categorías encontradas:', [
                'categories' => $productsByCategory->keys()->toArray(),
                'products_per_category' => $productsByCategory->map(function ($products) {
                    return $products->count();
                })->toArray()
            ]);

            $pdf = Pdf::loadView('price-list-pdf', [
                'productsByCategory' => $productsByCategory,
                'currency' => 'ARS',
                'showImages' => false,
                'exportDate' => now()->format('d/m/Y H:i'),
            ])->setPaper('a4', 'portrait');

            $filename = 'lista-precios-' . now()->format('Y-m-d') . '.pdf';

            return $pdf->stream($filename);

        } catch (\Exception $e) {
            Log::error('Error generando lista de precios: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error generando lista de precios',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function searchProductsForBulkUpdate(Request $request)
    {
        try {
            $validatedData = $this->validateSearchRequest($request);

            $query = $this->buildSearchQuery($validatedData);

            $products = $this->executeSearch($query, $validatedData);

            return $this->formatSearchResponse($products);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->handleValidationError($e);
        } catch (\Exception $e) {
            return $this->handleSearchError($e);
        }
    }

    public function getBulkUpdateStats(Request $request)
    {
        try {
            $validatedData = $this->validateStatsRequest($request);
            $query = $this->buildStatsQuery($validatedData);
            $stats = $this->calculateStats($query);

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->handleValidationError($e);
        } catch (\Exception $e) {
            return $this->handleStatsError($e);
        }
    }

    public function bulkUpdatePricesBySupplier(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'supplier_ids' => 'required|array|min:1',
                'supplier_ids.*' => 'integer|exists:suppliers,id',
                'update_type' => 'required|in:percentage,fixed',
                'value' => 'required|numeric',
            ]);

            $result = $this->productService->bulkUpdatePricesBySupplier(
                $validatedData['supplier_ids'],
                $validatedData['update_type'],
                $validatedData['value']
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error en actualización masiva por proveedor', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar precios',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
            ], 500);
        }
    }

    private function validateSearchRequest(Request $request): array
    {
        return $request->validate([
            'search' => 'nullable|string|max:255',
            'supplier_ids' => 'nullable|array',
            'supplier_ids.*' => 'integer|exists:suppliers,id',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer|exists:categories,id',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer|exists:products,id',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);
    }

    private function buildSearchQuery(array $filters)
    {
        $query = Product::query()
            ->with(['category:id,name', 'supplier:id,name'])
            ->select([
                'id',
                'description',
                'code',
                'unit_price',
                'currency',
                'sale_price',
                'category_id',
                'supplier_id',
                'status'
            ])
            ->where('status', true);

        $this->applySearchFilter($query, $filters);
        $this->applySupplierFilter($query, $filters);
        $this->applyCategoryFilter($query, $filters);
        $this->applyProductFilter($query, $filters);
        $this->applyBranchFilter($query, $filters);

        return $query;
    }

    private function applySearchFilter($query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }
    }

    private function applySupplierFilter($query, array $filters): void
    {
        if (!empty($filters['supplier_ids'])) {
            $query->whereIn('supplier_id', $filters['supplier_ids']);
        }
    }

    private function applyCategoryFilter($query, array $filters): void
    {
        if (!empty($filters['category_ids'])) {
            $query->whereIn('category_id', $filters['category_ids']);
        }
    }

    private function applyProductFilter($query, array $filters): void
    {
        if (!empty($filters['product_ids'])) {
            $query->whereIn('id', $filters['product_ids']);
        }
    }

    private function applyBranchFilter($query, array $filters): void
    {
        if (!empty($filters['branch_id'])) {
            $query->whereHas('stocks', function ($q) use ($filters) {
                $q->where('branch_id', $filters['branch_id']);
            });
        }
    }

    private function executeSearch($query, array $filters)
    {
        $page = $filters['page'] ?? 1;
        $perPage = min($filters['per_page'] ?? 50, 100);

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    private function formatSearchResponse($products)
    {
        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
            ],
            'meta' => [
                'has_data' => $products->count() > 0,
                'total_pages' => $products->lastPage(),
            ]
        ]);
    }

    private function handleValidationError(\Illuminate\Validation\ValidationException $e)
    {
        Log::warning('Validación fallida en búsqueda de productos', [
            'errors' => $e->errors(),
            'input' => $e->validator->getData()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Datos de entrada inválidos',
            'errors' => $e->errors()
        ], 422);
    }

    private function handleSearchError(\Exception $e)
    {
        Log::error('Error en búsqueda de productos para actualización masiva', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error interno del servidor al buscar productos',
            'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
        ], 500);
    }

    private function validateStatsRequest(Request $request): array
    {
        return $request->validate([
            'search' => 'nullable|string|max:255',
            'supplier_ids' => 'nullable|array',
            'supplier_ids.*' => 'integer|exists:suppliers,id',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer|exists:categories,id',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);
    }

    private function buildStatsQuery(array $filters)
    {
        $query = Product::query()->where('status', true);

        $this->applySearchFilter($query, $filters);
        $this->applySupplierFilter($query, $filters);
        $this->applyCategoryFilter($query, $filters);
        $this->applyBranchFilter($query, $filters);

        return $query;
    }

    private function calculateStats($query): array
    {
        $totalProducts = $query->count();
        $totalValue = $query->sum('unit_price');
        $averagePrice = $totalProducts > 0 ? $totalValue / $totalProducts : 0;

        return [
            'total_products' => $totalProducts,
            'total_value' => round($totalValue, 2),
            'average_price' => round($averagePrice, 2),
        ];
    }

    private function handleStatsError(\Exception $e)
    {
        Log::error('Error calculando estadísticas de productos', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error al calcular estadísticas',
            'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
        ], 500);
    }

    private function updateProductPrices($products, array $updateData): int
    {
        $updatedCount = 0;
        $updateType = $updateData['update_type'];
        $value = $updateData['value'];

        foreach ($products as $product) {
            $newPrice = $this->calculateNewPrice($product->unit_price, $updateType, $value);

            $product->update(['unit_price' => $newPrice]);
            $updatedCount++;
        }

        return $updatedCount;
    }

}