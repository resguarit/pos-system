<?php

namespace App\Services;

use App\Interfaces\CurrentAccountServiceInterface;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrentAccountService implements CurrentAccountServiceInterface
{
    public function createAccount(array $data)
    {
        return CurrentAccount::create($data);
    }

    public function getAccountByCustomer(int $customerId)
    {
        return CurrentAccount::where('customer_id', $customerId)
            ->where('account_type', 'customer')
            ->first();
    }

    public function getAccountBySupplier(int $supplierId)
    {
        return CurrentAccount::where('supplier_id', $supplierId)
            ->where('account_type', 'supplier')
            ->first();
    }

    public function createMovement(array $data)
    {
        return DB::transaction(function () use ($data) {
            $movement = CurrentAccountMovement::create($data);
            
            // Actualizar el balance de la cuenta corriente
            $account = $movement->currentAccount;
            $account->balance += $data['amount'];
            $account->save();

            return $movement;
        });
    }

    public function getAccountMovements(int $accountId, Request $request)
    {
        $query = CurrentAccountMovement::with(['cashMovement'])
            ->where('current_account_id', $accountId);

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        return $query->orderByDesc('created_at')->paginate(15);
    }

    public function getAccountBalance(int $accountId)
    {
        $account = CurrentAccount::findOrFail($accountId);
        return $account->balance;
    }

    public function processPayment(int $accountId, array $paymentData)
    {
        return DB::transaction(function () use ($accountId, $paymentData) {
            $account = CurrentAccount::findOrFail($accountId);
            
            // Crear movimiento de cuenta corriente (negativo para reducir deuda)
            $this->createMovement([
                'current_account_id' => $accountId,
                'cash_movement_id' => $paymentData['cash_movement_id'] ?? null,
                'reference_type' => 'payment',
                'reference_id' => $paymentData['reference_id'] ?? null,
                'amount' => -$paymentData['amount'], // Negativo para reducir el saldo
                'description' => $paymentData['description'],
                'due_date' => null,
            ]);

            return $account->fresh();
        });
    }
}
