<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * Agrega el permiso ver_trazabilidad_producto y lo asigna al rol Form.
     */
    public function up(): void
    {
        // Insertar el permiso si no existe (puede haber sido creado por PermissionSeeder)
        if (!DB::table('permissions')->where('name', 'ver_trazabilidad_producto')->exists()) {
            DB::table('permissions')->insert([
                'name' => 'ver_trazabilidad_producto',
                'description' => 'Ver trazabilidad del producto',
                'module' => 'productos',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $permission = DB::table('permissions')->where('name', 'ver_trazabilidad_producto')->first();
        if (!$permission) {
            return;
        }

        // Crear rol Form si no existe
        $formRole = DB::table('roles')->where('name', 'Form')->first();
        if (!$formRole) {
            DB::table('roles')->insert([
                'name' => 'Form',
                'description' => 'Rol con acceso a trazabilidad de productos',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $formRole = DB::table('roles')->where('name', 'Form')->first();
        }

        if ($formRole) {
            $exists = DB::table('permission_role')
                ->where('role_id', $formRole->id)
                ->where('permission_id', $permission->id)
                ->exists();

            if (!$exists) {
                DB::table('permission_role')->insert([
                    'role_id' => $formRole->id,
                    'permission_id' => $permission->id,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = DB::table('permissions')->where('name', 'ver_trazabilidad_producto')->first();

        if ($permission) {
            DB::table('permission_role')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
