<?php

namespace App\Http\Controllers;

use App\Interfaces\CategoryServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

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
        
        if ($limit) {
            $categories = $this->categoryService->getAllCategories($search)->take($limit);
        } elseif ($perPage) {
            // Solo paginar si se especifica per_page
            $categories = $this->categoryService->getAllCategories($search, $perPage);
        } else {
            // Por defecto, devolver todas las categorías sin paginación
            $categories = $this->categoryService->getAllCategories($search);
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
        $category = $this->categoryService->getCategoryById($id);
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
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:500',
            'parent_id' => 'nullable|integer|exists:categories,id'
        ]);

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
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:500',
            'parent_id' => 'nullable|integer|exists:categories,id'
        ]);
        try {
            $category = $this->categoryService->updateCategory($id, $validatedData);
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
            $categories = $this->categoryService->getParentCategories();
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
            $categories = $this->categoryService->getSubcategories($parentId);
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
            $categories = $this->categoryService->getCategoriesForSelector();
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
            $deleted = $this->categoryService->deleteCategory($id);
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
            $exists = $this->categoryService->checkNameExists($name);
            
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
