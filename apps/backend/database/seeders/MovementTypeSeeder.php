<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MovementType;

class MovementTypeSeeder extends Seeder
{
    public function run()
    {
        $movementTypes = [
            [
                'name' => 'Venta en efectivo',
                'description' => 'Ingreso por venta realizada en efectivo',
                'operation_type' => 'entrada',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ],
            [
                'name' => 'Venta a crédito',
                'description' => 'Venta realizada a cuenta corriente',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Pago de cuenta corriente',
                'description' => 'Pago recibido de cliente por cuenta corriente',
                'operation_type' => 'entrada',
                'is_cash_movement' => true,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Gasto operativo',
                'description' => 'Gastos del negocio',
                'operation_type' => 'salida',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ],
            [
                'name' => 'Compra en efectivo',
                'description' => 'Compra de mercadería',
                'operation_type' => 'salida',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ],
            [
                'name' => 'Retiro de efectivo',
                'description' => 'Retiro de dinero de la caja',
                'operation_type' => 'salida',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ],
            [
                'name' => 'Ingreso inicial',
                'description' => 'Monto inicial al abrir la caja',
                'operation_type' => 'entrada',
                'is_cash_movement' => true,
                'is_current_account_movement' => false,
                'active' => true,
            ],
        ];

        foreach ($movementTypes as $type) {
            MovementType::firstOrCreate(
                ['name' => $type['name']], 
                $type
            );
        }
    }
}
