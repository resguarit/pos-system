<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combos', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nombre único del combo
            $table->string('description')->nullable(); // Descripción opcional
            $table->enum('discount_type', ['percentage', 'fixed_amount']); // Tipo de descuento
            $table->decimal('discount_value', 8, 2); // Valor del descuento
            $table->boolean('is_active')->default(true); // Estado del combo
            $table->text('notes')->nullable(); // Notas adicionales
            $table->timestamps();
            $table->softDeletes();
            
            // Índices para optimización
            $table->index(['is_active', 'deleted_at']);
            $table->unique('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combos');
    }
};





