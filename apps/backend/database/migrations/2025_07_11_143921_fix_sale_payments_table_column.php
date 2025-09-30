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
        Schema::table('sale_payments', function (Blueprint $table) {
            // Verificar si existe el campo sale_id y renombrarlo
            if (Schema::hasColumn('sale_payments', 'sale_id')) {
                $table->renameColumn('sale_id', 'sale_header_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_payments', function (Blueprint $table) {
            // Revertir el cambio
            if (Schema::hasColumn('sale_payments', 'sale_header_id')) {
                $table->renameColumn('sale_header_id', 'sale_id');
            }
        });
    }
};
