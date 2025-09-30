<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Cambiar markup de formato porcentaje (20.00) a decimal (0.20)
            $table->decimal('markup', 8, 4)->change();
        });
        
        // Actualizar datos existentes: convertir porcentajes a decimales
        DB::statement('UPDATE products SET markup = markup / 100 WHERE markup > 1');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Revertir: convertir decimales a porcentajes
            DB::statement('UPDATE products SET markup = markup * 100');
            $table->decimal('markup', 8, 2)->change();
        });
    }
};
