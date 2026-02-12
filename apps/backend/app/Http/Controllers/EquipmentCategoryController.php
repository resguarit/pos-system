<?php

namespace App\Http\Controllers;

use App\Interfaces\CategoryServiceInterface;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class EquipmentCategoryController extends Controller
{
    private string $type = Category::TYPE_EQUIPMENT;

    public function __construct(private CategoryServiceInterface $categoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $search = $request->get('search');
        $perPage = $request->get('per_page');
        $limit = $request->get('limit');

        if ($limit) {
            $categories = $this->categoryService->getAllCategories($search, null, $this->type)->take($limit);
        } elseif ($perPage) {
            $categories = $this->categoryService->getAllCategories($search, $perPage, $this->type);
        } else {
            $categories = $this->categoryService->getAllCategories($search, null, $this->type);
        }

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Categorías de equipos obtenidas correctamente',
            'data' => $categories,
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $category = $this->categoryService->getCategoryById($id, $this->type);
        if (!$category) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Categoría de equipo no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Categoría de equipo obtenida correctamente',
            'data' => $category,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->where('category_type', $this->type),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('category_type', $this->type),
            ],
        ]);

        $validatedData['category_type'] = $this->type;

        try {
            $category = $this->categoryService->createCategory($validatedData);
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Categoría de equipo creada correctamente',
                'data' => $category,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear la categoría de equipo: ' . $e->getMessage(),
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
                    ->where('category_type', $this->type)
                    ->ignore($id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('category_type', $this->type),
            ],
        ]);

        try {
            $category = $this->categoryService->updateCategory($id, $validatedData, $this->type);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categoría de equipo actualizada correctamente',
                'data' => $category,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar la categoría de equipo: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function parents(): JsonResponse
    {
        try {
            $categories = $this->categoryService->getParentCategories($this->type);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categorías padre de equipos obtenidas correctamente',
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener las categorías padre de equipos: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function subcategories(Request $request, $parentId = null): JsonResponse
    {
        try {
            $categories = $this->categoryService->getSubcategories($parentId, $this->type);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Subcategorías de equipos obtenidas correctamente',
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener las subcategorías de equipos: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function forSelector(): JsonResponse
    {
        try {
            $categories = $this->categoryService->getCategoriesForSelector($this->type);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categorías de equipos para selector obtenidas correctamente',
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener categorías de equipos para selector: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $deleted = $this->categoryService->deleteCategory($id, $this->type);
            if (!$deleted) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Categoría de equipo no encontrada',
                ], 404);
            }

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Categoría de equipo eliminada correctamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar la categoría de equipo: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function checkName($name): JsonResponse
    {
        try {
            $exists = $this->categoryService->checkNameExists($name, $this->type);

            return response()->json([
                'exists' => $exists,
            ]);
        } catch (\Exception $e) {
            Log::error('Error checking equipment category name: ' . $e->getMessage());
            return response()->json([
                'exists' => false,
            ], 500);
        }
    }
}
