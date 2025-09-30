<?php

namespace App\Traits;

use App\Services\CashRegisterService;
use Illuminate\Http\JsonResponse;

trait ChecksCashRegister
{
    /**
     * Verifica si hay una caja abierta para la sucursal especificada
     */
    protected function verifyCashRegisterOpen(int $branchId): ?JsonResponse
    {
        try {
            $cashRegisterService = app(CashRegisterService::class);
            $currentCashRegister = $cashRegisterService->getCurrentCashRegister($branchId);
            
            if (!$currentCashRegister) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una caja abierta para esta sucursal. Debe abrir la caja antes de realizar esta operación.',
                    'error_code' => 'CASH_REGISTER_NOT_OPEN',
                    'data' => [
                        'branch_id' => $branchId,
                        'required_action' => 'open_cash_register'
                    ]
                ], 400);
            }
            
            return null; // Sin error, caja abierta
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el estado de la caja: ' . $e->getMessage(),
                'error_code' => 'CASH_REGISTER_CHECK_ERROR'
            ], 500);
        }
    }

    /**
     * Obtiene la caja abierta actual para la sucursal
     */
    protected function getCurrentCashRegister(int $branchId)
    {
        $cashRegisterService = app(CashRegisterService::class);
        return $cashRegisterService->getCurrentCashRegister($branchId);
    }

    /**
     * Verifica si hay una caja abierta y devuelve información útil
     */
    protected function getCashRegisterStatus(int $branchId): array
    {
        try {
            $cashRegisterService = app(CashRegisterService::class);
            $currentCashRegister = $cashRegisterService->getCurrentCashRegister($branchId);
            
            return [
                'is_open' => $currentCashRegister !== null,
                'cash_register' => $currentCashRegister,
                'branch_id' => $branchId,
                'message' => $currentCashRegister 
                    ? 'Caja abierta y disponible para operaciones' 
                    : 'No hay caja abierta para esta sucursal'
            ];
        } catch (\Exception $e) {
            return [
                'is_open' => false,
                'cash_register' => null,
                'branch_id' => $branchId,
                'error' => $e->getMessage(),
                'message' => 'Error al verificar estado de la caja'
            ];
        }
    }
}
