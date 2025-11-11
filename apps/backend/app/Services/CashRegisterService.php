<?php

namespace App\Services;

use App\Interfaces\CashRegisterServiceInterface;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CashRegisterService implements CashRegisterServiceInterface
{
    public function openCashRegister(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Verificar que no hay una caja abierta en la sucursal
            $existingOpen = CashRegister::where('branch_id', $data['branch_id'])
                ->where('status', 'open')
                ->first();

            if ($existingOpen) {
                throw new \Exception('Ya existe una caja abierta en esta sucursal');
            }

            $data['opened_at'] = Carbon::now();
            $data['status'] = 'open';

            return CashRegister::create($data);
        });
    }

    public function closeCashRegister(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $cashRegister = CashRegister::findOrFail($id);

            if ($cashRegister->status === 'closed') {
                throw new \Exception('Esta caja ya está cerrada');
            }

            $finalAmount = $data['final_amount'];

            // Actualizar campos básicos
            $cashRegister->update([
                'closed_at' => Carbon::now(),
                'final_amount' => $finalAmount,
                'status' => 'closed',
                'notes' => $data['notes'] ?? null,
            ]);

            // Calcular y guardar campos optimizados
            $cashRegister->updateCalculatedFields();

            return $cashRegister->fresh();
        });
    }

    public function getCurrentCashRegister(int $branchId)
    {
        return CashRegister::with(['branch', 'user'])
            ->where('branch_id', $branchId)
            ->where('status', 'open')
            ->first();
    }

    /**
     * Obtener el estado de caja para múltiples sucursales
     */
    public function getMultipleBranchesCashRegisterStatus(array $branchIds): array
    {
        if (empty($branchIds)) {
            return $this->getEmptyStatusResponse();
        }

        $openRegisters = $this->getOpenCashRegistersForBranches($branchIds);
        $closedBranchIds = $this->getClosedBranchIds($branchIds, $openRegisters);
        
        return $this->buildStatusResponse($branchIds, $openRegisters, $closedBranchIds);
    }

    /**
     * Obtener cajas abiertas para las sucursales especificadas
     */
    private function getOpenCashRegistersForBranches(array $branchIds)
    {
        return CashRegister::with(['branch', 'user'])
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'open')
            ->get();
    }

    /**
     * Obtener IDs de sucursales con caja cerrada
     */
    private function getClosedBranchIds(array $branchIds, $openRegisters): array
    {
        $openBranchIds = $openRegisters->pluck('branch_id')->toArray();
        return array_diff($branchIds, $openBranchIds);
    }

    /**
     * Construir respuesta de estado
     */
    private function buildStatusResponse(array $branchIds, $openRegisters, array $closedBranchIds): array
    {
        $totalBranches = count($branchIds);
        $openCount = $openRegisters->count();
        $closedCount = count($closedBranchIds);

        return [
            'open_registers' => $openRegisters,
            'closed_branches' => $this->formatClosedBranches($closedBranchIds),
            'total_branches' => $totalBranches,
            'open_count' => $openCount,
            'closed_count' => $closedCount,
            'all_open' => $openCount === $totalBranches,
            'all_closed' => $openCount === 0,
            'mixed_status' => $openCount > 0 && $openCount < $totalBranches
        ];
    }

    /**
     * Formatear sucursales cerradas
     */
    private function formatClosedBranches(array $closedBranchIds): array
    {
        return array_map(function ($branchId) {
            return ['branch_id' => $branchId];
        }, $closedBranchIds);
    }

    /**
     * Respuesta vacía para cuando no hay sucursales
     */
    private function getEmptyStatusResponse(): array
    {
        return [
            'open_registers' => collect(),
            'closed_branches' => [],
            'total_branches' => 0,
            'open_count' => 0,
            'closed_count' => 0,
            'all_open' => false,
            'all_closed' => true,
            'mixed_status' => false
        ];
    }

    public function getCashRegisterHistory(Request $request)
    {
        $query = CashRegister::with(['branch', 'user'])
            ->select([
                'cash_registers.*',
                // Si no tiene los campos calculados, calcularlos en la consulta
                DB::raw('COALESCE(cash_registers.expected_cash_balance, 
                    (SELECT cash_registers.initial_amount + COALESCE(SUM(
                        CASE 
                            WHEN mt.operation_type = "entrada" THEN cm.amount 
                            WHEN mt.operation_type = "salida" THEN -cm.amount 
                            ELSE 0 
                        END
                    ), 0)
                    FROM cash_movements cm 
                    JOIN movement_types mt ON cm.movement_type_id = mt.id 
                    WHERE cm.cash_register_id = cash_registers.id 
                    AND mt.is_cash_movement = true
                    AND mt.name NOT IN ("Apertura automática", "Cierre automático", "Ajuste del sistema")
                    AND (
                        (mt.operation_type = "entrada" AND (
                            cm.payment_method_id IN (
                                SELECT pm.id FROM payment_methods pm 
                                WHERE pm.is_active = true 
                                AND (pm.name LIKE "%efectivo%" OR pm.name LIKE "%cash%" OR pm.name LIKE "%contado%")
                            ) OR cm.payment_method_id IS NULL
                        ))
                        OR (mt.operation_type = "salida" AND (
                            cm.payment_method_id IN (
                                SELECT pm.id FROM payment_methods pm 
                                WHERE pm.is_active = true 
                                AND (pm.name LIKE "%efectivo%" OR pm.name LIKE "%cash%" OR pm.name LIKE "%contado%")
                            ) OR cm.payment_method_id IS NULL
                        ))
                    )
                )) as calculated_expected_cash_balance'),
                
                DB::raw('COALESCE(cash_registers.cash_difference,
                    CASE 
                        WHEN cash_registers.final_amount IS NOT NULL THEN 
                            cash_registers.final_amount - COALESCE(cash_registers.expected_cash_balance, 
                                (SELECT cash_registers.initial_amount + COALESCE(SUM(
                                    CASE 
                                        WHEN mt.operation_type = "entrada" THEN cm.amount 
                                        WHEN mt.operation_type = "salida" THEN -cm.amount 
                                        ELSE 0 
                                    END
                                ), 0)
                                FROM cash_movements cm 
                                JOIN movement_types mt ON cm.movement_type_id = mt.id 
                                WHERE cm.cash_register_id = cash_registers.id 
                                AND mt.is_cash_movement = true
                                AND mt.name NOT IN ("Apertura automática", "Cierre automático", "Ajuste del sistema")
                                AND (
                                    (mt.operation_type = "entrada" AND (
                                        cm.payment_method_id IN (
                                            SELECT pm.id FROM payment_methods pm 
                                            WHERE pm.is_active = true 
                                            AND (pm.name LIKE "%efectivo%" OR pm.name LIKE "%cash%" OR pm.name LIKE "%contado%")
                                        ) OR cm.payment_method_id IS NULL
                                    ))
                                    OR (mt.operation_type = "salida" AND (
                                        cm.payment_method_id IN (
                                            SELECT pm.id FROM payment_methods pm 
                                            WHERE pm.is_active = true 
                                            AND (pm.name LIKE "%efectivo%" OR pm.name LIKE "%cash%" OR pm.name LIKE "%contado%")
                                        ) OR cm.payment_method_id IS NULL
                                    ))
                                )
                            ))
                        ELSE NULL 
                    END
                ) as calculated_cash_difference')
            ]);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->has('from_date')) {
            $query->whereDate('opened_at', '>=', $request->input('from_date'));
        }

        if ($request->has('to_date')) {
            $query->whereDate('opened_at', '<=', $request->input('to_date'));
        }

        return $query->orderByDesc('opened_at')->paginate(15);
    }

    public function getCashRegisterById(int $id)
    {
        return CashRegister::with(['branch', 'user', 'cashMovements.movementType'])
            ->findOrFail($id);
    }

    /**
     * Obtener el último cierre de caja para una sucursal
     * 
     * @param int $branchId ID de la sucursal
     * @return float|null El monto final de la última caja cerrada, o null si no existe
     * @throws \InvalidArgumentException Si el branchId no es válido
     */
    public function getLastClosure(int $branchId): ?float
    {
        if ($branchId <= 0) {
            throw new \InvalidArgumentException('El ID de sucursal debe ser un número positivo');
        }

        $lastClosed = CashRegister::where('branch_id', $branchId)
            ->where('status', 'closed')
            ->whereNotNull('final_amount')
            ->whereNotNull('closed_at')
            ->orderBy('closed_at', 'desc')
            ->first();

        return $lastClosed ? (float) $lastClosed->final_amount : null;
    }
}
