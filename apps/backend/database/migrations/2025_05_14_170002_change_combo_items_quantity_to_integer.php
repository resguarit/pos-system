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
        Schema::table('combo_items', function (Blueprint $table) {
            // Cambiar la columna quantity de decimal a integer
            $table->integer('quantity')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('combo_items', function (Blueprint $table) {
            // Revertir a decimal:3
            $table->decimal('quantity', 8, 3)->change();
        });
    }
};
