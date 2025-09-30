<?php

namespace App\Http\Middleware;

use App\Services\CashRegisterService;
use App\Models\ReceiptType;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CheckCashRegisterOpen
{
    protected $cashRegisterService;

    public function __construct(CashRegisterService $cashRegisterService)
    {
        $this->cashRegisterService = $cashRegisterService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // --- NUEVA LÓGICA: Verificar si es presupuesto ---
        $receiptTypeId = $request->input('receipt_type_id');
        
        if ($receiptTypeId) {
            $receiptType = ReceiptType::find($receiptTypeId);
            
            // Si es presupuesto, permitir sin validar caja abierta
            if ($receiptType && $receiptType->name === 'Presupuesto') {
                // Agregar información nula de caja para evitar errores
                $request->merge([
                    'current_cash_register' => null,
                    'current_cash_register_id' => null
                ]);
                
                return $next($request);
            }
        }
        // --- FIN DE NUEVA LÓGICA ---
        
        // Obtener branch_id prioritariamente del request, luego del usuario
        $branchId = $request->input('branch_id');
        
        // Si no hay branch_id en el request, intentar obtenerlo del usuario autenticado
        if (!$branchId && $request->user()) {
            $branchId = $request->user()->branch_id;
        }
        
        // Si aún no hay branch_id, usar 1 por defecto
        if (!$branchId) {
            $branchId = 1;
        }
        
        try {
            $currentCashRegister = $this->cashRegisterService->getCurrentCashRegister($branchId);
            
            if (!$currentCashRegister) {
                return response()->json([
                    'success' => false,
                    'message' => "No se encontró una caja abierta para registrar la venta.",
                    'error_code' => 'CASH_REGISTER_NOT_OPEN',
                    'branch_id' => $branchId,
                    'debug_info' => [
                        'requested_branch_id' => $request->input('branch_id'),
                        'user_branch_id' => $request->user() ? $request->user()->branch_id : null,
                        'final_branch_id' => $branchId,
                        'available_open_cash_registers' => \App\Models\CashRegister::with('branch')->where('status', 'open')->get()->map(function($cr) {
                            return [
                                'cash_register_id' => $cr->id,
                                'branch_id' => $cr->branch_id,
                                'branch_name' => $cr->branch->description ?? 'N/A'
                            ];
                        })
                    ]
                ], 400);
            }

            // Agregar la caja actual al request para usarla en el controlador
            $request->merge([
                'current_cash_register' => $currentCashRegister,
                'current_cash_register_id' => $currentCashRegister->id
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el estado de la caja: ' . $e->getMessage(),
                'error_code' => 'CASH_REGISTER_CHECK_ERROR'
            ], 500);
        }

        return $next($request);
    }
}