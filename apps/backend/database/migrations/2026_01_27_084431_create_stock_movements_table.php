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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->decimal('quantity', 10, 2); // Can be negative for reductions
            $table->string('type'); // 'sale', 'purchase', 'adjustment', 'transfer', 'initial'
            $table->nullableMorphs('reference'); // Polymorphic relation to Sale, PurchaseOrder, etc.
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');

            // Snapshots for historical accuracy
            $table->decimal('current_stock_balance', 10, 2)->nullable();
            $table->decimal('unit_price_snapshot', 10, 2)->nullable(); // Cost at the time of movement
            $table->decimal('sale_price_snapshot', 10, 2)->nullable(); // Sale price at the time of movement

            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['product_id', 'created_at']);
            $table->index(['branch_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
