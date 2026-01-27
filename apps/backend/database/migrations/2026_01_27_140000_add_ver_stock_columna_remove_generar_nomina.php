<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * - Agrega el permiso ver_stock_columna (productos) para producción.
     * - Elimina el permiso generar_nomina si existe.
     */
    public function up(): void
    {
        // Agregar ver_stock_columna si no existe (para producción)
        if (!DB::table('permissions')->where('name', 'ver_stock_columna')->exists()) {
            DB::table('permissions')->insert([
                'name' => 'ver_stock_columna',
                'description' => 'Ver columna de stock en listados de productos',
                'module' => 'productos',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Eliminar permiso generar_nomina si existe (y sus asignaciones a roles)
        $perm = DB::table('permissions')->where('name', 'generar_nomina')->first();
        if ($perm) {
            DB::table('permission_role')->where('permission_id', $perm->id)->delete();
            DB::table('permissions')->where('id', $perm->id)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restaurar generar_nomina no tiene sentido sin datos; no se revierte.
        // Quitar ver_stock_columna
        $perm = DB::table('permissions')->where('name', 'ver_stock_columna')->first();
        if ($perm) {
            DB::table('permission_role')->where('permission_id', $perm->id)->delete();
            DB::table('permissions')->where('id', $perm->id)->delete();
        }
    }
};
