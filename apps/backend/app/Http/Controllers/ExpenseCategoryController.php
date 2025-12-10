<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseCategory::query();

        // Search functionality
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%");
            });
        }

        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }

        if ($request->has('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        // Check if pagination is requested
        if ($request->has('page') || $request->has('limit') || $request->has('per_page')) {
            $perPage = $request->input('limit', $request->input('per_page', 15));
            $categories = $query->latest()->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $categories->items(),
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ]);
        }

        // Return all categories without pagination
        return response()->json([
            'success' => true,
            'data' => $query->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:expense_categories,id',
            'active' => 'boolean',
        ]);

        $validated['active'] = $validated['active'] ?? true;
        $category = ExpenseCategory::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return response()->json([
            'success' => true,
            'data' => $expenseCategory->load('children')
        ]);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:expense_categories,id',
            'active' => 'boolean',
        ]);

        $expenseCategory->update($validated);
        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => $expenseCategory
        ]);
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        if ($expenseCategory->expenses()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with existing expenses.'
            ], 422);
        }

        $expenseCategory->delete();
        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }
}
