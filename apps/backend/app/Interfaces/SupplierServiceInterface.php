<?php

namespace App\Interfaces;

interface SupplierServiceInterface
{
    public function getAllSuppliers();
    public function getSupplierById(int $id): ?\App\Models\Supplier;
    public function createSupplier(array $data);
    public function updateSupplier(int $id, array $data): \App\Models\Supplier;
    public function deleteSupplier(int $id): bool;
    public function checkNameExists($name): bool;
}