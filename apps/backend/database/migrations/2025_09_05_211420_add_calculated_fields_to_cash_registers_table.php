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
        Schema::table('cash_registers', function (Blueprint $table) {
            // Campos calculados para optimizar rendimiento
            $table->decimal('expected_cash_balance', 12, 2)->nullable()->after('final_amount')
                ->comment('Saldo esperado en efectivo calculado automáticamente');
            $table->decimal('cash_difference', 12, 2)->nullable()->after('expected_cash_balance')
                ->comment('Diferencia entre contado y esperado (final_amount - expected_cash_balance)');
            $table->json('payment_method_totals')->nullable()->after('cash_difference')
                ->comment('Totales por método de pago calculados automáticamente');
            
            // Índices para mejorar performance
            $table->index(['status', 'branch_id']);
            $table->index(['opened_at', 'branch_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropIndex(['status', 'branch_id']);
            $table->dropIndex(['opened_at', 'branch_id']);
            $table->dropColumn(['expected_cash_balance', 'cash_difference', 'payment_method_totals']);
        });
    }
};
