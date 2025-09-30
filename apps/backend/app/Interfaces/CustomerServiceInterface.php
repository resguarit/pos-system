<?php

namespace App\Interfaces;

interface CustomerServiceInterface
{
    public function getAllCustomers();
    public function getCustomerById($id);
    public function createCustomer(array $data);
    public function updateCustomer($id, array $data);
    public function deleteCustomer($id);
    public function getCustomerSalesSummary($id, $fromDate = null, $toDate = null); // Updated method signature
    public function searchCustomers($searchTerm);
    public function checkNameExists($firstName, $lastName): bool;
}
