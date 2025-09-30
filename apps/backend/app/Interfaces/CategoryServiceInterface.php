<?php

namespace App\Interfaces;

interface CategoryServiceInterface
{
    public function getAllCategories();
    public function getParentCategories();
    public function getSubcategories($parentId = null);
    public function getCategoryById($id);
    public function createCategory(array $data);
    public function updateCategory($id, array $data);
    public function deleteCategory($id);
    public function getCategoriesForSelector();
    public function checkNameExists($name): bool;
}