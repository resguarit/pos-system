<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ensure "Pago a Proveedor" (Salida) movement type exists for Cash Movements

        $exists = DB::table('movement_types')
            ->where('name', 'Pago a Proveedor')
            ->where('operation_type', 'salida')
            ->exists();

        if (!$exists) {
            DB::table('movement_types')->insert([
                'name' => 'Pago a Proveedor',
                'description' => 'Salida de caja por pago a proveedor',
                'operation_type' => 'salida',
                'is_current_account_movement' => false, // To avoid confusion with the Entrada one used for debt reduction
                'is_cash_movement' => true,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // DB::table('movement_types')
        //     ->where('name', 'Pago a Proveedor')
        //     ->where('operation_type', 'salida')
        //     ->delete();
    }
};
