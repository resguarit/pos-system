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
        Schema::create('subcontracted_service_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subcontracted_service_id');
            $table->foreign('subcontracted_service_id', 'ssp_service_fk')
                ->references('id')
                ->on('subcontracted_services')
                ->cascadeOnDelete();

            $table->foreignId('current_account_movement_id')->nullable();
            $table->foreign('current_account_movement_id', 'ssp_cam_fk')
                ->references('id')
                ->on('current_account_movements')
                ->nullOnDelete();

            $table->foreignId('payment_method_id')->nullable();
            $table->foreign('payment_method_id', 'ssp_payment_method_fk')
                ->references('id')
                ->on('payment_methods')
                ->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('user_id')->nullable();
            $table->foreign('user_id', 'ssp_user_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['subcontracted_service_id', 'paid_at'], 'subcontracted_service_payments_service_paid_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontracted_service_payments');
    }
};
