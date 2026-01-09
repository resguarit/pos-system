<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * Agrega el permiso para gestionar restricciones de horario en roles.
     */
    public function up(): void
    {
        // Insertar el permiso
        DB::table('permissions')->insert([
            'name' => 'gestionar_horarios_roles',
            'description' => 'Permite configurar restricciones de horario de acceso en los roles',
            'module' => 'roles',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Asignar automáticamente al rol Admin
        $adminRole = DB::table('roles')->whereIn('name', ['Admin', 'Administrador'])->first();
        $permission = DB::table('permissions')->where('name', 'gestionar_horarios_roles')->first();

        if ($adminRole && $permission) {
            // Verificar si ya existe la relación
            $exists = DB::table('permission_role')
                ->where('role_id', $adminRole->id)
                ->where('permission_id', $permission->id)
                ->exists();

            if (!$exists) {
                DB::table('permission_role')->insert([
                    'role_id' => $adminRole->id,
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
        $permission = DB::table('permissions')->where('name', 'gestionar_horarios_roles')->first();

        if ($permission) {
            // Eliminar relaciones
            DB::table('permission_role')->where('permission_id', $permission->id)->delete();
            // Eliminar permiso
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
