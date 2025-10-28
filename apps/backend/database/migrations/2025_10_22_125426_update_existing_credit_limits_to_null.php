<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Actualizar registros existentes donde credit_limit = 0 a NULL (límite infinito)
        DB::table('people')
            ->where('credit_limit', 0)
            ->update(['credit_limit' => null]);
            
        DB::table('current_accounts')
            ->where('credit_limit', 0)
            ->update(['credit_limit' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir registros donde credit_limit es NULL a 0
        DB::table('people')
            ->whereNull('credit_limit')
            ->update(['credit_limit' => 0]);
            
        DB::table('current_accounts')
            ->whereNull('credit_limit')
            ->update(['credit_limit' => 0]);
    }
};