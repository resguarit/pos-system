<?php

namespace App\Http\Controllers;

use App\Interfaces\CategoryServiceInterface;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    protected $categoryService;

    public function __construct(CategoryServiceInterface $categoryService)
    {
        $this->categoryService = $categoryService;
    }

    public function index(Request $request): JsonResponse
    {
        $search = $request->get('search');
        $perPage = $request->get('per_page');
        $limit = $request->get('limit');
        $type = Category::TYPE_PRODUCT;

        if ($limit) {
            $categories = $this->categoryService->getAllCategories($search, null, $type)->take($limit);
        } elseif ($perPage) {
            // Solo paginar si se especifica per_page
            $categories = $this->categoryService->getAllCategories($search, $perPage, $type);
        } else {
            // Por defecto, devolver todas las categorías sin paginación
            $categories = $this->categoryService->getAllCategories($search, null, $type);
        }

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Categorías obtenidas correctamente',
            'data' => $categories
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $category = $this->categoryService->getCategoryById($id, Category::TYPE_PRODUCT);
        if (!$category) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Categoría no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Categoría obtenida correctamente',
            'data' => $category
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where('category_type', Category::TYPE_PRODUCT)
                    ->whereNull('deleted_at'),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('category_type', Category::TYPE_PRODUCT),
            ],
        ]);

        $validatedData['category_type'] = Category::TYPE_PRODUCT;

        try {
            $category = $this->categoryService->createCategory($validatedData);
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Categoría creada correctamente',
                'data' => $category
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear la categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where('category_type', Category::TYPE_PRODUCT)
                    ->whereNull('deleted_at')
                    ->ignore($id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('category_type', Category::TYPE_PRODUCT),
            ],
        ]);
        try {
            $category = $this->categoryService->updateCategory($id, $validatedData, Category::TYPE_PRODUCT);
            if (!$category) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Categoría no encontrada'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categoría actualizada correctamente',
                'data' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar la categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get only parent categories (no parent_id)
     */
    public function parents(): JsonResponse
    {

        try {
            $categories = $this->categoryService->getParentCategories(Category::TYPE_PRODUCT);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categorías padre obtenidas correctamente',
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener las categorías padre: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get subcategories by parent ID
     */
    public function subcategories(Request $request, $parentId = null): JsonResponse
    {
        try {
            $categories = $this->categoryService->getSubcategories($parentId, Category::TYPE_PRODUCT);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Subcategorías obtenidas correctamente',
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener las subcategorías: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all categories formatted for selectors (flat list with hierarchy indication)
     */
    public function forSelector(): JsonResponse
    {
        try {
            $categories = $this->categoryService->getCategoriesForSelector(Category::TYPE_PRODUCT);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categorías para selector obtenidas correctamente',
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener las categorías para selector: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $deleted = $this->categoryService->deleteCategory($id, Category::TYPE_PRODUCT);
            if (!$deleted) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Categoría no encontrada'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categoría eliminada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar la categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkName($name): JsonResponse
    {
        try {
            $exists = $this->categoryService->checkNameExists($name, Category::TYPE_PRODUCT);

            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            Log::error('Error checking category name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }
}
