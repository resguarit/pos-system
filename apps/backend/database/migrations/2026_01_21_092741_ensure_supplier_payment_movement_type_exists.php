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
        // Ensure "Pago a Proveedor" movement type exists
        // It should be 'entrada' (Inflow) to reduce debt (or balance depending on perspective).
        // Since we established that customer payments are 'entrada' and reduce customer debt,
        // supplier payments should also be 'entrada' and reduce supplier debt.

        $exists = DB::table('movement_types')
            ->where('name', 'Pago a Proveedor')
            ->exists();

        if (!$exists) {
            DB::table('movement_types')->insert([
                'name' => 'Pago a Proveedor',
                'description' => 'Pago realizado a un proveedor',
                'operation_type' => 'entrada', // Reduces debt
                'is_current_account_movement' => true,
                'is_cash_movement' => true, // Affects cash register too
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
        // We don't necessarily want to delete it on rollback as it might have data associated
        // But for correctness:
        // DB::table('movement_types')->where('name', 'Pago a Proveedor')->delete();
    }
};
