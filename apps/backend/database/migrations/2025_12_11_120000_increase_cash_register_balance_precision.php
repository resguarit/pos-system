<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Aumentar precisión de campos monetarios en cash_registers
     * para soportar valores más grandes.
     */
    public function up(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            // Aumentar precisión a DECIMAL(20,2) para soportar valores más grandes
            $table->decimal('expected_cash_balance', 20, 2)->nullable()->change();
            $table->decimal('cash_difference', 20, 2)->nullable()->change();
            $table->decimal('initial_amount', 20, 2)->nullable()->change();
            $table->decimal('final_amount', 20, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->decimal('expected_cash_balance', 12, 2)->nullable()->change();
            $table->decimal('cash_difference', 12, 2)->nullable()->change();
            $table->decimal('initial_amount', 12, 2)->nullable()->change();
            $table->decimal('final_amount', 12, 2)->nullable()->change();
        });
    }
};
