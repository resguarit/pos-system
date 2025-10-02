<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Interfaces\SaleServiceInterface;
use App\Services\StockService;
use App\Services\CashMovementService;
use App\Services\CurrentAccountService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\SaleHeader;
use App\Models\CashMovement;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use Exception;

class SaleAnnulmentController extends Controller
{
    protected SaleServiceInterface $saleService;
    protected StockService $stockService;
    protected CashMovementService $cashMovementService;
    protected CurrentAccountService $currentAccountService;

    public function __construct(
        SaleServiceInterface $saleService,
        StockService $stockService,
        CashMovementService $cashMovementService,
        CurrentAccountService $currentAccountService
    ) {
        $this->saleService = $saleService;
        $this->stockService = $stockService;
        $this->cashMovementService = $cashMovementService;
        $this->currentAccountService = $currentAccountService;
    }

    /**
     * Anular una venta
     */
    public function annul(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        return DB::transaction(function () use ($request, $id) {
            try {
                // 1. Buscar la venta con todas sus relaciones
                $sale = SaleHeader::with([
                    'items.product',
                    'salePayments.paymentMethod',
                    'cashMovements',
                    'currentAccountMovements',
                    'receiptType',
                    'branch'
                ])->findOrFail($id);

                // 2. Verificar que la venta no esté ya anulada
                if ($sale->status === 'annulled') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Esta venta ya está anulada'
                    ], 400);
                }

                // 3. Verificar que no sea un presupuesto
                if ($sale->receiptType && $sale->receiptType->afip_code === '016') {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se pueden anular presupuestos'
                    ], 400);
                }

                $reason = $request->input('reason');

                // 4. Revertir stock (solo si no es presupuesto)
                $this->revertStock($sale);

                // 5. Revertir movimientos de caja
                $this->revertCashMovements($sale);

                // 6. Revertir movimientos de cuenta corriente
                $this->revertCurrentAccountMovements($sale);

                // 7. Marcar la venta como anulada
                $sale->update([
                    'status' => 'annulled',
                    'annulled_at' => now(),
                    'annulled_by' => auth()->id(),
                    'annulment_reason' => $reason,
                ]);

                // 8. Actualizar campos calculados de la caja
                $this->updateCashRegisterCalculatedFields($sale);

                return response()->json([
                    'success' => true,
                    'message' => 'Venta anulada exitosamente',
                    'data' => $sale->fresh()
                ], 200);

            } catch (Exception $e) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Error al anular la venta: ' . $e->getMessage()
                ], 500);
            }
        });
    }

    /**
     * Revertir el stock de los productos
     */
    private function revertStock(SaleHeader $sale): void
    {
        foreach ($sale->items as $item) {
            // Aumentar el stock en la cantidad que se había reducido
            $this->stockService->increaseStockByProductAndBranch(
                $item->product_id,
                $sale->branch_id,
                $item->quantity
            );
        }
    }

    /**
     * Revertir movimientos de caja
     */
    private function revertCashMovements(SaleHeader $sale): void
    {
        // Buscar o crear tipo de movimiento para anulación
        $annulmentMovementType = MovementType::firstOrCreate(
            ['name' => 'Anulación de venta', 'operation_type' => 'salida'],
            [
                'description' => 'Salida por anulación de venta',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ]
        );

        // Crear movimientos de salida para revertir los ingresos
        foreach ($sale->cashMovements as $cashMovement) {
            // Crear movimiento de salida con el mismo monto
            $this->cashMovementService->createMovement([
                'cash_register_id' => $cashMovement->cash_register_id,
                'movement_type_id' => $annulmentMovementType->id,
                'payment_method_id' => $cashMovement->payment_method_id,
                'reference_type' => 'sale_annulment',
                'reference_id' => $sale->id,
                'amount' => $cashMovement->amount,
                'description' => "Anulación de venta #{$sale->receipt_number} - {$sale->annulment_reason}",
                'user_id' => auth()->id(),
            ]);
        }
    }

    /**
     * Revertir movimientos de cuenta corriente
     */
    private function revertCurrentAccountMovements(SaleHeader $sale): void
    {
        // Buscar o crear tipo de movimiento para anulación de cuenta corriente
        $annulmentMovementType = MovementType::firstOrCreate(
            ['name' => 'Anulación de venta a crédito', 'operation_type' => 'salida'],
            [
                'description' => 'Salida por anulación de venta a crédito',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ]
        );

        // Crear movimientos de salida para revertir los ingresos
        foreach ($sale->currentAccountMovements as $currentAccountMovement) {
            // Crear movimiento de salida con el mismo monto
            $this->currentAccountService->create([
                'current_account_id' => $currentAccountMovement->current_account_id,
                'movement_type_id' => $annulmentMovementType->id,
                'amount' => $currentAccountMovement->amount,
                'description' => "Anulación de venta a crédito #{$sale->receipt_number} - {$sale->annulment_reason}",
                'reference' => "ANNUL-{$sale->receipt_number}",
                'sale_id' => $sale->id,
                'metadata' => [
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'annulment_reason' => $sale->annulment_reason,
                    'original_movement_id' => $currentAccountMovement->id,
                ]
            ]);
        }
    }

    /**
     * Actualizar campos calculados de la caja
     */
    private function updateCashRegisterCalculatedFields(SaleHeader $sale): void
    {
        // Obtener la caja asociada a la venta
        $cashRegister = null;
        foreach ($sale->cashMovements as $cashMovement) {
            if ($cashMovement->cashRegister && $cashMovement->cashRegister->status === 'open') {
                $cashRegister = $cashMovement->cashRegister;
                break;
            }
        }

        if ($cashRegister) {
            // Actualizar campos calculados
            $cashRegister->updateCalculatedFields();
        }
    }
}
