<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\MovementType;
use Illuminate\Database\Seeder;

class CurrentAccountMovementTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $movementTypes = [
            // ============================================
            // TIPOS DE MOVIMIENTOS MANUALES DE CRÉDITO (ENTRADA)
            // ============================================
            
            // 1. AJUSTE A FAVOR: Bonificación/descuento del negocio
            //    - NO genera movimiento en caja (no es dinero real)
            //    - Acumula crédito utilizable (se consume al usarlo)
            //    - Ejemplo: "Te damos $5,000 de descuento"
            [
                'name' => 'Ajuste a favor',
                'description' => 'Bonificación o descuento que acumula crédito utilizable',
                'operation_type' => 'entrada',
                'is_current_account_movement' => true,
                'affects_cash' => false,
                'active' => true,
            ],
            
            // 2. DEPÓSITO A CUENTA: Dinero real que el cliente paga
            //    - SÍ genera movimiento en caja (dinero real)
            //    - Acumula crédito utilizable
            //    - Ejemplo: Cliente paga $10,000 por adelantado
            [
                'name' => 'Depósito a cuenta',
                'description' => 'Dinero que el cliente paga (efectivo, transferencia, etc.)',
                'operation_type' => 'entrada',
                'is_current_account_movement' => true,
                'affects_cash' => true,
                'active' => true,
            ],
            
            // ============================================
            // TIPOS DE MOVIMIENTOS MANUALES DE DÉBITO (SALIDA)
            // ============================================
            
            // 3. AJUSTE EN CONTRA: Corrección contable que aumenta la deuda
            //    - NO genera movimiento en caja
            //    - Aumenta el balance (deuda del cliente)
            //    - Ejemplo: Corrección de error, ajuste de inventario
            [
                'name' => 'Ajuste en contra',
                'description' => 'Ajuste contable que aumenta la deuda del cliente',
                'operation_type' => 'salida',
                'is_current_account_movement' => true,
                'affects_cash' => false,
                'active' => true,
            ],
            
            // 4. INTERÉS APLICADO: Interés por mora o financiación
            //    - NO genera movimiento en caja
            //    - Aumenta el balance (deuda del cliente)
            //    - Ejemplo: Interés del 2% mensual por deuda vencida
            [
                'name' => 'Interés aplicado',
                'description' => 'Interés por mora o financiación aplicado a la cuenta',
                'operation_type' => 'salida',
                'is_current_account_movement' => true,
                'affects_cash' => false,
                'active' => true,
            ],
            
            // ============================================
            // TIPOS DE MOVIMIENTOS AUTOMÁTICOS (NO EDITABLES POR USUARIO)
            // ============================================
            
            // Movimientos generados por el sistema
            [
                'name' => 'Venta',
                'description' => 'Venta registrada a cuenta corriente',
                'operation_type' => 'salida',
                'is_current_account_movement' => true,
                'affects_cash' => false,
                'active' => true,
            ],
            [
                'name' => 'Pago de cuenta corriente',
                'description' => 'Pago realizado a una venta pendiente',
                'operation_type' => 'entrada',
                'is_current_account_movement' => true,
                'affects_cash' => true,
                'active' => true,
            ],
            [
                'name' => 'Uso de crédito a favor',
                'description' => 'Uso de crédito acumulado para pagar una venta',
                'operation_type' => 'entrada',
                'is_current_account_movement' => true,
                'affects_cash' => false,
                'active' => true,
            ],
        ];

        foreach ($movementTypes as $type) {
            MovementType::firstOrCreate(
                ['name' => $type['name'], 'is_current_account_movement' => true],
                $type
            );
        }

        $this->command->info('Tipos de movimiento de cuenta corriente creados/actualizados exitosamente.');
    }
}
