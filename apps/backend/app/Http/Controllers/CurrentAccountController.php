<?php

namespace App\Http\Controllers;

use App\Interfaces\CurrentAccountServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CurrentAccountController extends Controller
{
    protected CurrentAccountServiceInterface $currentAccountService;

    public function __construct(CurrentAccountServiceInterface $currentAccountService)
    {
        $this->currentAccountService = $currentAccountService;
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|integer|exists:customers,id',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'account_type' => 'required|in:customer,supplier',
            'credit_limit' => 'numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validar que se proporcione customer_id o supplier_id según el tipo
        if ($request->input('account_type') === 'customer' && !$request->input('customer_id')) {
            return response()->json(['error' => 'customer_id es requerido para cuentas de cliente'], 422);
        }
        if ($request->input('account_type') === 'supplier' && !$request->input('supplier_id')) {
            return response()->json(['error' => 'supplier_id es requerido para cuentas de proveedor'], 422);
        }

        try {
            $account = $this->currentAccountService->createAccount($request->all());
            return response()->json([
                'message' => 'Cuenta corriente creada exitosamente',
                'data' => $account
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getByCustomer(int $customerId): JsonResponse
    {
        $account = $this->currentAccountService->getAccountByCustomer($customerId);
        
        if (!$account) {
            return response()->json([
                'message' => 'No se encontró cuenta corriente para este cliente',
                'data' => null
            ], 200);
        }

        return response()->json([
            'message' => 'Cuenta corriente obtenida',
            'data' => $account
        ], 200);
    }

    public function movements(int $accountId, Request $request): JsonResponse
    {
        try {
            $movements = $this->currentAccountService->getAccountMovements($accountId, $request);
            return response()->json([
                'message' => 'Movimientos obtenidos',
                'data' => $movements
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cuenta no encontrada'], 404);
        }
    }

    public function balance(int $accountId): JsonResponse
    {
        try {
            $balance = $this->currentAccountService->getAccountBalance($accountId);
            return response()->json([
                'message' => 'Balance obtenido',
                'data' => ['balance' => $balance]
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cuenta no encontrada'], 404);
        }
    }

    public function processPayment(int $accountId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'cash_movement_id' => 'nullable|integer|exists:cash_movements,id',
            'reference_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $account = $this->currentAccountService->processPayment($accountId, $request->all());
            return response()->json([
                'message' => 'Pago procesado exitosamente',
                'data' => $account
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
