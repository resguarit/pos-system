<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Agrega el permiso ver_stock_otras_sucursales para producción.
     * Permite a un usuario ver el stock de todas las sucursales (solo lectura),
     * sin necesidad de estar asociado a cada una.
     */
    public function up(): void
    {
        if (!DB::table('permissions')->where('name', 'ver_stock_otras_sucursales')->exists()) {
            DB::table('permissions')->insert([
                'name' => 'ver_stock_otras_sucursales',
                'description' => 'Ver stock de todas las sucursales (solo lectura)',
                'module' => 'inventario',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $perm = DB::table('permissions')->where('name', 'ver_stock_otras_sucursales')->first();
        if ($perm) {
            DB::table('permission_role')->where('permission_id', $perm->id)->delete();
            DB::table('permissions')->where('id', $perm->id)->delete();
        }
    }
};
