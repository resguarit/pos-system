<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            // Payment related fields
            if (!Schema::hasColumn('repairs', 'is_paid')) {
                $table->boolean('is_paid')->default(false)->after('sale_price');
            }

            if (!Schema::hasColumn('repairs', 'payment_method_id')) {
                $table->foreignId('payment_method_id')
                    ->nullable()
                    ->after('is_paid')
                    ->constrained('payment_methods')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('repairs', 'amount_paid')) {
                $table->decimal('amount_paid', 12, 2)
                    ->nullable()
                    ->after('payment_method_id')
                    ->comment('Monto registrado en caja cuando se marcó como cobrado');
            }

            if (!Schema::hasColumn('repairs', 'paid_at')) {
                $table->timestamp('paid_at')
                    ->nullable()
                    ->after('amount_paid')
                    ->comment('Fecha y hora cuando se registró el pago en caja');
            }

            if (!Schema::hasColumn('repairs', 'cash_movement_id')) {
                $table->foreignId('cash_movement_id')
                    ->nullable()
                    ->after('paid_at')
                    ->constrained('cash_movements')
                    ->nullOnDelete()
                    ->comment('Referencia al movimiento de caja creado');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (Schema::hasColumn('repairs', 'cash_movement_id')) {
                $table->dropForeign(['cash_movement_id']);
                $table->dropColumn('cash_movement_id');
            }

            if (Schema::hasColumn('repairs', 'paid_at')) {
                $table->dropColumn('paid_at');
            }

            if (Schema::hasColumn('repairs', 'amount_paid')) {
                $table->dropColumn('amount_paid');
            }

            if (Schema::hasColumn('repairs', 'payment_method_id')) {
                $table->dropForeign(['payment_method_id']);
                $table->dropColumn('payment_method_id');
            }

            if (Schema::hasColumn('repairs', 'is_paid')) {
                $table->dropColumn('is_paid');
            }
        });
    }
};
