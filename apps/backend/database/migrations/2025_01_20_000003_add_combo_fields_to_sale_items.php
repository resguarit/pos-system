<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            // Agregar campos para manejar combos en las ventas
            $table->foreignId('combo_id')->nullable()->constrained('combos')->onDelete('cascade');
            $table->boolean('is_combo')->default(false); // Flag para identificar si es un combo
            
            // Índices para optimización
            $table->index(['combo_id', 'is_combo']);
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropForeign(['combo_id']);
            $table->dropColumn(['combo_id', 'is_combo']);
        });
    }
};

