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
        DB::table('movement_types')->insert([
            'name' => 'Ingreso de efectivo',
            'description' => 'Ingreso manual de dinero a la caja',
            'operation_type' => 'entrada',
            'is_cash_movement' => true,
            'is_current_account_movement' => false,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('movement_types')->where('name', 'Ingreso de efectivo')->delete();
    }
};
