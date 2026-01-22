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
        Schema::create('service_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Ej: "Hosting", "SSL", "Dominio", "Soporte"
            $table->text('description')->nullable();
            $table->decimal('price', 15, 2); // Precio base
            $table->enum('billing_cycle', ['monthly', 'quarterly', 'annual', 'one_time'])->default('monthly');
            $table->string('icon')->nullable(); // Nombre del ícono para UI
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_types');
    }
};
