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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('expense_categories');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Creator
            $table->foreignId('payment_method_id')->nullable()->constrained('payment_methods');
            $table->foreignId('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();

            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->date('date'); // Incurred date
            $table->date('due_date')->nullable(); // For projections

            $table->enum('status', ['pending', 'approved', 'paid', 'cancelled'])->default('pending');

            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_interval')->nullable(); // e.g., 'monthly', 'weekly'

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
