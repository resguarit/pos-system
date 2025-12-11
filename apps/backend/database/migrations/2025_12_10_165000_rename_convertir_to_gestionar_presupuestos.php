<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Rename permission from 'convertir_presupuestos' to 'gestionar_presupuestos'
        DB::table('permissions')
            ->where('name', 'convertir_presupuestos')
            ->update([
                    'name' => 'gestionar_presupuestos',
                    'description' => 'Gestionar Presupuestos (aprobar, editar, eliminar, convertir)',
                    'updated_at' => now()
                ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert permission name back to 'convertir_presupuestos'
        DB::table('permissions')
            ->where('name', 'gestionar_presupuestos')
            ->update([
                    'name' => 'convertir_presupuestos',
                    'description' => 'Convertir Presupuestos',
                    'updated_at' => now()
                ]);
    }
};
