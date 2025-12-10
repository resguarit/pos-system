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
        // 1. Crear el nuevo permiso 'crear_ventas_fiscales'
        $permissionId = DB::table('permissions')->insertGetId([
            'name' => 'crear_ventas_fiscales',
            'description' => 'Permite emitir comprobantes fiscales (facturas)',
            'module' => 'ventas',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Asignar este permiso a todos los roles que ya tienen 'crear_ventas'
        // para mantener la compatibilidad inicial.

        // Obtener ID del permiso 'crear_ventas'
        $crearVentasPermission = DB::table('permissions')
            ->where('name', 'crear_ventas')
            ->first();

        if ($crearVentasPermission) {
            // Obtener roles que tienen 'crear_ventas'
            $rolesWithCreateSales = DB::table('permission_role')
                ->where('permission_id', $crearVentasPermission->id)
                ->pluck('role_id');

            // Asignar 'crear_ventas_fiscales' a esos roles
            $newPermissions = [];
            foreach ($rolesWithCreateSales as $roleId) {
                $newPermissions[] = [
                    'permission_id' => $permissionId,
                    'role_id' => $roleId,
                ];
            }

            if (!empty($newPermissions)) {
                DB::table('permission_role')->insert($newPermissions);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Eliminar asignaciones del permiso
        $permission = DB::table('permissions')->where('name', 'crear_ventas_fiscales')->first();

        if ($permission) {
            DB::table('permission_role')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
