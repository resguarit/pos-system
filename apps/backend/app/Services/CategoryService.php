<?php

namespace App\Services;

use App\Models\Category;
use App\Interfaces\CategoryServiceInterface;

class CategoryService implements CategoryServiceInterface
{
    public function getAllCategories($search = null, $perPage = null)
    {
        $query = Category::with(['parent', 'children']);
        
        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }
        
        if ($perPage) {
            return $query->paginate($perPage);
        }
        
        return $query->get();
    }

    public function getParentCategories()
    {
        return Category::parents()->with('children')->get();
    }

    public function getSubcategories($parentId = null)
    {
        $query = Category::subcategories()->with('parent');
        
        if ($parentId) {
            $query->where('parent_id', $parentId);
        }
        
        return $query->get();
    }

    public function createCategory(array $data)
    {
        // Validar que si se especifica parent_id, el padre exista y no sea una subcategoría
        if (isset($data['parent_id']) && !is_null($data['parent_id'])) {
            $parent = Category::find($data['parent_id']);
            if (!$parent) {
                throw new \Exception('La categoría padre especificada no existe.');
            }
            if ($parent->isSubcategory()) {
                throw new \Exception('No se puede crear una subcategoría de otra subcategoría. Solo se permiten 2 niveles.');
            }
        }
        
        return Category::create($data);
    }

    public function getCategoryById($id)
    {
        return Category::with(['parent', 'children'])->findOrFail($id);
    }

    public function updateCategory($id, array $data)
    {
        $category = Category::findOrFail($id);
        
        // Validar que si se especifica parent_id, el padre exista y no sea una subcategoría
        if (isset($data['parent_id']) && !is_null($data['parent_id'])) {
            // No puede ser padre de sí mismo
            if ($data['parent_id'] == $id) {
                throw new \Exception('Una categoría no puede ser padre de sí misma.');
            }
            
            $parent = Category::find($data['parent_id']);
            if (!$parent) {
                throw new \Exception('La categoría padre especificada no existe.');
            }
            if ($parent->isSubcategory()) {
                throw new \Exception('No se puede crear una subcategoría de otra subcategoría. Solo se permiten 2 niveles.');
            }
            
            // Si la categoría actual tiene hijos, no puede convertirse en subcategoría
            if ($category->children()->count() > 0) {
                throw new \Exception('Una categoría con subcategorías no puede convertirse en subcategoría.');
            }
        }
        
        $category->update($data);
        return $category;
    }

    public function deleteCategory($id)
    {
        $category = Category::findOrFail($id);
        
        // Si es una categoría padre con hijos, no se puede eliminar
        if ($category->children()->count() > 0) {
            throw new \Exception('No se puede eliminar una categoría que tiene subcategorías. Elimine primero las subcategorías.');
        }
        
        $category->delete();
        return $category;
    }

    public function getCategoriesForSelector()
    {
        // Obtener todas las categorías con estructura jerárquica para selectores
        $categories = Category::with(['parent', 'children'])->get();
        
        $formatted = [];
        
        // Primero agregar categorías padre
        $parentCategories = $categories->where('parent_id', null);
        foreach ($parentCategories as $parent) {
            $formatted[] = [
                'id' => $parent->id,
                'name' => $parent->name,
                'description' => $parent->description,
                'parent_id' => null,
                'type' => 'parent',
                'display_name' => "📁 {$parent->name}",
                'level' => 0
            ];
            
            // Agregar subcategorías
            $subcategories = $categories->where('parent_id', $parent->id);
            foreach ($subcategories as $subcategory) {
                $formatted[] = [
                    'id' => $subcategory->id,
                    'name' => $subcategory->name,
                    'description' => $subcategory->description,
                    'parent_id' => $subcategory->parent_id,
                    'type' => 'subcategory',
                    'display_name' => "  📄 {$subcategory->name}",
                    'level' => 1
                ];
            }
        }
        
        return $formatted;
    }

    public function checkNameExists($name): bool
    {
        return Category::where('name', $name)->exists();
    }
}