<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('repair_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('repair_id')->constrained('repairs')->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods')->restrictOnDelete();
            $table->foreignId('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->boolean('charge_with_iva')->default(true);
            $table->timestamp('paid_at')->nullable();
            $table->boolean('is_reversed')->default(false);
            $table->timestamp('reversed_at')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();

            $table->index(['repair_id', 'created_at']);
        });

        Schema::table('repairs', function (Blueprint $table) {
            if (!Schema::hasColumn('repairs', 'payment_status')) {
                $table->string('payment_status', 20)->default('pending')->after('is_paid');
            }

            if (!Schema::hasColumn('repairs', 'total_paid')) {
                $table->decimal('total_paid', 12, 2)->default(0)->after('amount_paid');
            }
        });

        // Backfill histórico desde el esquema de pago único.
        DB::statement(
            "INSERT INTO repair_payments (repair_id, payment_method_id, cash_movement_id, amount, charge_with_iva, paid_at, user_id, created_at, updated_at)
            SELECT
                id,
                payment_method_id,
                cash_movement_id,
                amount_paid,
                COALESCE(charge_with_iva, 1),
                paid_at,
                NULL,
                COALESCE(paid_at, CURRENT_TIMESTAMP),
                CURRENT_TIMESTAMP
            FROM repairs
            WHERE is_paid = 1
              AND payment_method_id IS NOT NULL
              AND amount_paid IS NOT NULL
              AND amount_paid > 0"
        );

        DB::statement(
            "UPDATE repairs
            SET
                total_paid = COALESCE(amount_paid, 0),
                payment_status = CASE
                    WHEN is_paid = 1 THEN 'paid'
                    WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
                    ELSE 'pending'
                END"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (Schema::hasColumn('repairs', 'total_paid')) {
                $table->dropColumn('total_paid');
            }

            if (Schema::hasColumn('repairs', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
        });

        Schema::dropIfExists('repair_payments');
    }
};