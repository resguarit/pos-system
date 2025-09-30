<?php

namespace App\Services;

use App\Models\PaymentMethod;
use App\Services\Interfaces\PaymentMethodServiceInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class PaymentMethodService implements PaymentMethodServiceInterface
{
    public function getAllPaymentMethods(): Collection
    {
        return PaymentMethod::all();
    }

    public function getPaymentMethodById(int $id): ?PaymentMethod
    {
        return PaymentMethod::find($id);
    }

    public function createPaymentMethod(array $data): PaymentMethod
    {
        return PaymentMethod::create($data);
    }

    public function updatePaymentMethod(int $id, array $data): ?PaymentMethod
    {
        $paymentMethod = PaymentMethod::find($id);
        if ($paymentMethod) {
            $paymentMethod->update($data);
            return $paymentMethod;
        }
        return null;
    }

    public function deletePaymentMethod(int $id): bool
    {
        $paymentMethod = PaymentMethod::find($id);
        if ($paymentMethod) {
            return $paymentMethod->delete();
        }
        return false;
    }
}