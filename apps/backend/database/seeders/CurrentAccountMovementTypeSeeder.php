<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MovementType;

class CurrentAccountMovementTypeSeeder extends Seeder
{
    public function run(): void
    {
        $movementTypes = [
            // Movimientos de entrada (pagos, créditos)
            [
                'name' => 'Pago de cuenta corriente',
                'description' => 'Pago realizado por el cliente para reducir su deuda',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Nota de crédito',
                'description' => 'Nota de crédito emitida por devolución o descuento',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Ajuste a favor',
                'description' => 'Ajuste contable que beneficia al cliente',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Bonificación',
                'description' => 'Bonificación otorgada al cliente',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            
            // Movimientos de salida (compras, débitos)
            [
                'name' => 'Compra a crédito',
                'description' => 'Compra realizada por el cliente a crédito',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Venta',
                'description' => 'Venta realizada al cliente',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Pago en efectivo',
                'description' => 'Pago realizado en efectivo',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Pago con tarjeta',
                'description' => 'Pago realizado con tarjeta',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Pago con transferencia',
                'description' => 'Pago realizado por transferencia bancaria',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Nota de débito',
                'description' => 'Nota de débito por interés, comisiones o gastos',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Interés aplicado',
                'description' => 'Interés aplicado por mora o financiación',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Comisión aplicada',
                'description' => 'Comisión aplicada por servicios administrativos',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Ajuste en contra',
                'description' => 'Ajuste contable que perjudica al cliente',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Gastos administrativos',
                'description' => 'Gastos administrativos aplicados a la cuenta',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
        ];
        
        $this->command->info('Creando tipos de movimiento para cuentas corrientes...');
        
        foreach ($movementTypes as $movementTypeData) {
            MovementType::firstOrCreate(
                ['name' => $movementTypeData['name']],
                $movementTypeData
            );
        }
        
        $this->command->info('Tipos de movimiento para cuentas corrientes creados exitosamente');
    }
}