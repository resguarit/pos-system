<?php

namespace App\Services;

use App\Interfaces\CashMovementServiceInterface;
use App\Models\CashMovement;
use App\Models\MovementType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashMovementService implements CashMovementServiceInterface
{
    public function createMovement(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Los montos se guardan siempre como positivos
            // La lógica de entrada/salida se aplica en el momento del cálculo
            $data['amount'] = abs($data['amount']);

            $movement = CashMovement::create($data);

            // Actualizar campos calculados del registro de caja
            if (isset($data['cash_register_id'])) {
                $cashRegister = \App\Models\CashRegister::find($data['cash_register_id']);
                if ($cashRegister) {
                    $cashRegister->updateCalculatedFields();
                }
            }

            // Cargar relaciones para que el frontend tenga toda la información
            $movement->load(['movementType', 'paymentMethod', 'user']);

            return $movement;
        });
    }

    public function getMovementsByRegister(int $cashRegisterId, Request $request)
    {
        $query = CashMovement::with(['movementType', 'user', 'paymentMethod', 'reference']) // Cargar relación
            ->where('cash_register_id', $cashRegisterId);

        if ($request->has('movement_type_id')) {
            $query->where('movement_type_id', $request->input('movement_type_id'));
        }

        if ($request->has('cash_only') && $request->input('cash_only') === 'true') {
            $query->where('movement_type_id', 1);
        }

        $q = trim((string) $request->input('q', ''));
        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('description', 'like', "%{$q}%")
                    ->orWhereHas('movementType', function ($mt) use ($q) {
                        $mt->where('description', 'like', "%{$q}%");
                    })
                    // --- ESTA ES LA SECCIÓN A CORREGIR ---
                    ->orWhereHas('user', function ($u) use ($q) {
                        // Laravel buscará en la tabla 'persons' a través del modelo User
                        // si la relación está bien definida (User -> belongsTo -> Person)
                        $u->where('username', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%")
                            ->orWhereHas('person', function ($p) use ($q) {
                            // Asumimos que la relación 'person' existe en tu modelo User
                            // y que la tabla 'persons' tiene las columnas 'first_name' y 'last_name'.
                            $p->where('first_name', 'like', "%{$q}%")
                                ->orWhere('last_name', 'like', "%{$q}%");
                        });
                    })
                    // --- FIN DE LA CORRECCIÓN ---
                    ->orWhereHas('paymentMethod', function ($pm) use ($q) {
                        $pm->where('name', 'like', "%{$q}%");
                    });
            });
        }
        $perPage = (int) $request->input('per_page', 10);
        $page = (int) $request->input('page', 1);
        return $query->orderByDesc('created_at')->paginate($perPage, ['*'], 'page', $page);
    }

    public function getMovementById(int $id)
    {
        return CashMovement::with(['cashRegister', 'movementType', 'user'])
            ->findOrFail($id);
    }

    public function deleteMovement(int $id)
    {
        return DB::transaction(function () use ($id) {
            $movement = CashMovement::findOrFail($id);

            if (!$movement->cashRegister->isOpen()) {
                throw new \Exception('No se puede eliminar un movimiento de una caja cerrada');
            }

            $cashRegisterId = $movement->cash_register_id;
            $result = $movement->delete();

            // Actualizar campos calculados del registro de caja después de eliminar
            $cashRegister = \App\Models\CashRegister::find($cashRegisterId);
            if ($cashRegister) {
                $cashRegister->updateCalculatedFields();
            }

            return $result;
        });
    }

    public function createSaleMovement(int $cashRegisterId, array $saleData)
    {
        // Se asume que el ID 1 siempre es 'Venta en efectivo'
        $saleMovementTypeId = 1;

        return $this->createMovement([
            'cash_register_id' => $cashRegisterId,
            'movement_type_id' => $saleMovementTypeId,
            'reference_type' => 'sale',
            'reference_id' => $saleData['sale_id'] ?? null,
            'amount' => $saleData['amount'],
            'description' => isset($saleData['receipt_number']) ? "Venta #{$saleData['receipt_number']}" : 'Venta',
            'user_id' => $saleData['user_id'],
        ]);
    }
}