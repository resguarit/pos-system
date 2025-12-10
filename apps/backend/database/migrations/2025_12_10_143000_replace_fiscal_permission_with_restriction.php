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
        // 1. Eliminar el permiso anterior 'crear_ventas_fiscales' y sus relaciones
        $oldPermission = DB::table('permissions')->where('name', 'crear_ventas_fiscales')->first();
        if ($oldPermission) {
            DB::table('permission_role')->where('permission_id', $oldPermission->id)->delete();
            DB::table('permissions')->where('id', $oldPermission->id)->delete();
        }

        // 2. Crear el nuevo permiso de restricción 'solo_crear_presupuestos'
        // Este permiso NO se asigna automáticamente a nadie, ya que es una restricción.
        // Se debe asignar manualmente a los roles que se quieran limitar.
        DB::table('permissions')->insert([
            'name' => 'solo_crear_presupuestos',
            'description' => 'Restringe al usuario a solo poder emitir Presupuestos (no facturas)',
            'module' => 'ventas',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Eliminar 'solo_crear_presupuestos'
        $newPermission = DB::table('permissions')->where('name', 'solo_crear_presupuestos')->first();
        if ($newPermission) {
            DB::table('permission_role')->where('permission_id', $newPermission->id)->delete();
            DB::table('permissions')->where('id', $newPermission->id)->delete();
        }

        // 2. Restaurar 'crear_ventas_fiscales' (sin asignaciones automáticas para simplificar rollback)
        DB::table('permissions')->insert([
            'name' => 'crear_ventas_fiscales',
            'description' => 'Permite emitir comprobantes fiscales (facturas)',
            'module' => 'ventas',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
