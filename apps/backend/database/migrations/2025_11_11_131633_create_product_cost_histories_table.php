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
        Schema::create('product_cost_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('previous_cost', 10, 2)->nullable();
            $table->decimal('new_cost', 10, 2);
            $table->string('currency', 3)->default('ARS');
            $table->string('source_type')->nullable(); // 'purchase_order', 'manual', 'bulk_update', etc.
            $table->unsignedBigInteger('source_id')->nullable(); // ID de la orden de compra, usuario, etc.
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Índices para mejorar consultas
            $table->index('product_id');
            $table->index('created_at');
            $table->index(['source_type', 'source_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_cost_histories');
    }
};
