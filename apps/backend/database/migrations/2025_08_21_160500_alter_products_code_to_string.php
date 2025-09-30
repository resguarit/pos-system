<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Cambiar la columna 'code' a string para permitir códigos de barras largos y con ceros a la izquierda
        Schema::table('products', function (Blueprint $table) {
            $table->string('code', 50)->change();
        });
    }

    public function down(): void
    {
        // Revertir a integer (no recomendado si ya hay códigos largos)
        Schema::table('products', function (Blueprint $table) {
            $table->integer('code')->change();
        });
    }
};
