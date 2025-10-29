<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combo_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_id')->constrained('combos')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('quantity', 8, 3); // Cantidad del producto en el combo
            $table->timestamps();
            
            // Índices para optimización
            $table->index(['combo_id', 'product_id']);
            $table->unique(['combo_id', 'product_id']); // Un producto no puede estar duplicado en el mismo combo
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_items');
    }
};





