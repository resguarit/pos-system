<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface CurrentAccountServiceInterface
{
    public function createAccount(array $data);
    public function getAccountByCustomer(int $customerId);
    public function getAccountBySupplier(int $supplierId);
    public function createMovement(array $data);
    public function getAccountMovements(int $accountId, Request $request);
    public function getAccountBalance(int $accountId);
    public function processPayment(int $accountId, array $paymentData);
}
