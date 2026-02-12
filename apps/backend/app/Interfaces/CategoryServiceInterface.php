<?php

namespace App\Interfaces;

interface CategoryServiceInterface
{
    public function getAllCategories($search = null, $perPage = null, $type = null);
    public function getParentCategories($type = null);
    public function getSubcategories($parentId = null, $type = null);
    public function getCategoryById($id, $type = null);
    public function createCategory(array $data);
    public function updateCategory($id, array $data, $type = null);
    public function deleteCategory($id, $type = null);
    public function getCategoriesForSelector($type = null);
    public function checkNameExists($name, $type = null): bool;
}