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
            'name' => 'Recargo',
            'description' => 'Recargo por actualización de precios o intereses',
            'operation_type' => 'salida',
            'is_cash_movement' => false,
            'is_current_account_movement' => true,
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
        DB::table('movement_types')->where('name', 'Recargo')->delete();
    }
};
