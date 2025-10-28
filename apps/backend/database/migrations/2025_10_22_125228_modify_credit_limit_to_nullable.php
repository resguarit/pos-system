<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('people', function (Blueprint $table) {
            // Cambiar credit_limit para permitir NULL (límite infinito)
            $table->decimal('credit_limit', 12, 2)->nullable()->change();
        });
        
        Schema::table('current_accounts', function (Blueprint $table) {
            // Cambiar credit_limit para permitir NULL (límite infinito)
            $table->decimal('credit_limit', 12, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('people', function (Blueprint $table) {
            // Revertir a default(0)
            $table->decimal('credit_limit', 12, 2)->default(0)->change();
        });
        
        Schema::table('current_accounts', function (Blueprint $table) {
            // Revertir a default(0)
            $table->decimal('credit_limit', 12, 2)->default(0)->change();
        });
    }
};