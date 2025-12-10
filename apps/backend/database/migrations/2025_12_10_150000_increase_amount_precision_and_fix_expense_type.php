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
        // Increase precision for cash_movements
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->decimal('amount', 20, 2)->change();
        });

        // Increase precision for cash_registers
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->decimal('initial_amount', 20, 2)->change();
            $table->decimal('final_amount', 20, 2)->nullable()->change();
        });

        // Increase precision for expenses
        Schema::table('expenses', function (Blueprint $table) {
            $table->decimal('amount', 20, 2)->change();
        });

        // Increase precision for current_accounts
        Schema::table('current_accounts', function (Blueprint $table) {
            $table->decimal('credit_limit', 20, 2)->nullable()->change();
            $table->decimal('current_balance', 20, 2)->default(0)->change();
        });

        // Increase precision for current_account_movements
        Schema::table('current_account_movements', function (Blueprint $table) {
            $table->decimal('amount', 20, 2)->change();
            $table->decimal('balance_before', 20, 2)->change();
            $table->decimal('balance_after', 20, 2)->change();
        });

        // Fix Movement Type Name
        // Rename 'Gasto' and 'Gasto operativo' to 'Gastos del negocio'
        DB::table('movement_types')
            ->whereIn('name', ['Gasto', 'Gasto operativo'])
            ->update([
                'name' => 'Gastos del negocio',
                'description' => 'Gastos del negocio'
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert precision changes (back to original values approximately)
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->decimal('amount', 12, 2)->change();
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->decimal('initial_amount', 12, 2)->change();
            $table->decimal('final_amount', 12, 2)->nullable()->change();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->decimal('amount', 15, 2)->change();
        });

        Schema::table('current_accounts', function (Blueprint $table) {
            $table->decimal('credit_limit', 12, 2)->default(0)->change();
            $table->decimal('current_balance', 12, 2)->default(0)->change();
        });

        Schema::table('current_account_movements', function (Blueprint $table) {
            $table->decimal('amount', 12, 2)->change();
            $table->decimal('balance_before', 12, 2)->change();
            $table->decimal('balance_after', 12, 2)->change();
        });

        // Reverting names is tricky as we merged them, so we skip that part or do a best effort
    }
};
