<?php

namespace App\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\PaymentMethod;

interface PaymentMethodServiceInterface
{
    public function getAllPaymentMethods(): Collection;
    public function getPaymentMethodById(int $id): ?PaymentMethod;
    public function createPaymentMethod(array $data): PaymentMethod;
    public function updatePaymentMethod(int $id, array $data): ?PaymentMethod;
    public function deletePaymentMethod(int $id): bool;
}