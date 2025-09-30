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
        // Drop tables if they exist to avoid conflicts
        Schema::dropIfExists('current_account_movements');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('current_accounts');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('movement_types');

        // Create movement_types table
        Schema::create('movement_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->enum('operation_type', ['entrada', 'salida']);
            $table->boolean('is_cash_movement')->default(true);
            $table->boolean('is_current_account_movement')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Create cash_registers table
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('branch_id');
            $table->decimal('initial_amount', 12, 2)->default(0);
            $table->decimal('final_amount', 12, 2)->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('branch_id')->references('id')->on('branches');
            $table->index(['user_id', 'status']);
            $table->index(['branch_id', 'opened_at']);
        });

        // Create cash_movements table
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cash_register_id');
            $table->unsignedBigInteger('movement_type_id');
            $table->decimal('amount', 12, 2);
            $table->string('description', 255);
            $table->string('reference', 100)->nullable();
            $table->unsignedBigInteger('sale_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('cash_register_id')->references('id')->on('cash_registers');
            $table->foreign('movement_type_id')->references('id')->on('movement_types');
            $table->foreign('sale_id')->references('id')->on('sales_header');
            
            $table->index(['cash_register_id', 'created_at']);
            $table->index(['movement_type_id', 'created_at']);
        });

        // Create current_accounts table
        Schema::create('current_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->decimal('current_balance', 12, 2)->default(0);
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers');
            $table->unique('customer_id');
            $table->index(['status', 'current_balance']);
        });

        // Create current_account_movements table
        Schema::create('current_account_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('current_account_id');
            $table->unsignedBigInteger('movement_type_id');
            $table->decimal('amount', 12, 2);
            $table->string('description', 255);
            $table->string('reference', 100)->nullable();
            $table->unsignedBigInteger('sale_id')->nullable();
            $table->decimal('balance_before', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('current_account_id')->references('id')->on('current_accounts');
            $table->foreign('movement_type_id')->references('id')->on('movement_types');
            $table->foreign('sale_id')->references('id')->on('sales_header');
            
            $table->index(['current_account_id', 'created_at']);
            $table->index(['movement_type_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('current_account_movements');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('current_accounts');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('movement_types');
    }
};
