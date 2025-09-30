<?php

namespace App\Http\Controllers;

use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
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
        // Si se solicita específicamente para admin, incluir productos inactivos
        $forAdmin = $request->query('for_admin', false);
        
        if ($forAdmin) {
            return response()->json($this->productService->getAllProductsForAdmin());
        }
        
        // Por defecto, solo productos activos (para POS, etc.)
        return response()->json($this->productService->getAllProducts());
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'description' => 'required|string|unique:products,description',
            'code' => 'required|string|max:50|unique:products,code',
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
            'branch_ids' => 'required|array|min:1',
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
        $exists = Product::where('code', $code)->exists();
        return response()->json(['exists' => $exists]);
    }

    public function checkDescription($description)
    {
        $exists = Product::where('description', $description)->exists();
        return response()->json(['exists' => $exists]);
    }

    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'description' => 'sometimes|required|string',
            'code' => 'sometimes|required|string|max:50',
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
            
            // Eliminación lógica (soft delete) - siempre permitida
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

    /**
     * Actualización masiva de precios
     */
    public function bulkUpdatePrices(Request $request)
    {
        try {
            $request->validate([
                'updates' => 'required|array|min:1',
                'updates.*.id' => 'required|integer|exists:products,id',
                'updates.*.unit_price' => 'required|numeric|min:0',
            ]);

            $updates = $request->input('updates');
            $updatedCount = 0;
            $failedUpdates = [];

            DB::beginTransaction();

            foreach ($updates as $update) {
                try {
                    $product = Product::findOrFail($update['id']);
                    $oldPrice = $product->unit_price;
                    
                    $product->update([
                        'unit_price' => $update['unit_price']
                    ]);

                    Log::info('Bulk price update', [
                        'product_id' => $product->id,
                        'product_description' => $product->description,
                        'old_price' => $oldPrice,
                        'new_price' => $update['unit_price'],
                        'currency' => $product->currency
                    ]);

                    $updatedCount++;
                } catch (\Exception $e) {
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

            DB::commit();

            return response()->json([
                'success' => true,
                'updated_count' => $updatedCount,
                'failed_updates' => $failedUpdates,
                'message' => "Se actualizaron {$updatedCount} productos correctamente"
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en actualización masiva de precios: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar precios masivamente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualización masiva de precios por categoría
     */
    public function bulkUpdatePricesByCategory(Request $request)
    {
        try {
            $request->validate([
                'category_ids' => 'required|array|min:1',
                'category_ids.*' => 'integer|exists:categories,id',
                'update_type' => 'required|in:percentage,fixed',
                'value' => 'required|numeric',
            ]);

            $categoryIds = $request->input('category_ids');
            $updateType = $request->input('update_type');
            $value = $request->input('value');

            // Validaciones adicionales
            if ($updateType === 'percentage' && ($value < -100 || $value > 1000)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El porcentaje debe estar entre -100% y 1000%'
                ], 400);
            }

            $products = Product::whereIn('category_id', $categoryIds)->get();
            
            if ($products->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron productos en las categorías seleccionadas'
                ], 404);
            }

            $updatedCount = 0;
            $failedUpdates = [];

            DB::beginTransaction();

            foreach ($products as $product) {
                try {
                    $oldPrice = $product->unit_price;
                    $newPrice = $this->calculateNewPrice($oldPrice, $updateType, $value);
                    
                    $product->update([
                        'unit_price' => $newPrice
                    ]);

                    Log::info('Bulk category price update', [
                        'product_id' => $product->id,
                        'product_description' => $product->description,
                        'category_id' => $product->category_id,
                        'update_type' => $updateType,
                        'value' => $value,
                        'old_price' => $oldPrice,
                        'new_price' => $newPrice,
                        'currency' => $product->currency
                    ]);

                    $updatedCount++;
                } catch (\Exception $e) {
                    $failedUpdates[] = [
                        'product_id' => $product->id,
                        'error' => $e->getMessage()
                    ];
                    
                    Log::error('Failed bulk category price update', [
                        'product_id' => $product->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'updated_count' => $updatedCount,
                'failed_updates' => $failedUpdates,
                'message' => "Se actualizaron {$updatedCount} productos de las categorías seleccionadas"
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en actualización masiva por categoría: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar precios por categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos por categorías
     */
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
                ->get(); // Incluir productos inactivos para administración

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

    /**
     * Calcular nuevo precio basado en tipo de actualización
     */
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
            
            // Obtener productos con filtros - incluir ambas monedas
            $query = Product::with(['category']);
            
            // Filtrar por estado de productos
            if (!$includeInactive) {
                $query->where('status', true);
            }
            
            // Filtrar por categorías
            if (!empty($categoryIds)) {
                $query->whereIn('category_id', $categoryIds);
            }
            
            // Filtrar por sucursales y stock agotado (combinado)
            if (!empty($branchIds)) {
                $query->whereHas('stocks', function($q) use ($branchIds, $includeOutOfStock) {
                    $q->whereIn('branch_id', $branchIds);
                    if (!$includeOutOfStock) {
                        $q->where('current_stock', '>', 0);
                    }
                });
            } elseif (!$includeOutOfStock) {
                // Si no se especifican sucursales pero se excluye stock agotado
                $query->whereHas('stocks', function($q) {
                    $q->where('current_stock', '>', 0);
                });
            }
            
            $products = $query->orderBy('category_id')
                ->orderBy('description')
                ->get();
            
            Log::info('Export Price List - Productos encontrados:', [
                'total_products' => $products->count()
            ]);
            
            // Debug: verificar productos y sus categorías
            foreach ($products->take(5) as $product) {
                Log::info('Producto debug:', [
                    'id' => $product->id,
                    'description' => $product->description,
                    'category_id' => $product->category_id,
                    'category_loaded' => $product->relationLoaded('category'),
                    'category_name' => $product->category ? $product->category->name : 'NULL'
                ]);
            }
            
            // Agrupar por categoría - usar 'name' en lugar de 'description'
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
                'currency' => 'ARS', // Siempre ARS
                'showImages' => false, // Sin imágenes
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
}
