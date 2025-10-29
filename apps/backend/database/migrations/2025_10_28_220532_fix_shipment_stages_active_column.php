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
        // Solo ejecutar si la tabla existe
        if (!Schema::hasTable('shipment_stages')) {
            return;
        }
        
        // Verificar si existe la columna 'active' y renombrarla a 'is_active'
        if (Schema::hasColumn('shipment_stages', 'active') && !Schema::hasColumn('shipment_stages', 'is_active')) {
            Schema::table('shipment_stages', function (Blueprint $table) {
                $table->renameColumn('active', 'is_active');
            });
        }
        
        // Si ya tiene 'is_active', no hacer nada
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('shipment_stages')) {
            return;
        }
        
        // Renombrar de vuelta a 'active' si existe 'is_active'
        if (Schema::hasColumn('shipment_stages', 'is_active') && !Schema::hasColumn('shipment_stages', 'active')) {
            Schema::table('shipment_stages', function (Blueprint $table) {
                $table->renameColumn('is_active', 'active');
            });
        }
    }
};
