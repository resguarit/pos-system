<?php

namespace App\Interfaces;

interface ProductServiceInterface
{
    public function getAllProducts();

    public function getAllProductsForAdmin();

    public function createProduct(array $data);

    public function getProductById($id);

    public function updateProduct($id, array $data);

    public function deleteProduct($id);

    public function getAllCategories();

    public function getAllIvas();

    public function getAllMeasures();

    public function getAllSuppliers();

    public function getAllBranches();

    public function bulkUpdatePrices(array $updates);

    public function bulkUpdatePricesByCategory(array $categoryIds, string $updateType, float $value);

    public function bulkUpdatePricesBySupplier(array $supplierIds, string $updateType, float $value);
}