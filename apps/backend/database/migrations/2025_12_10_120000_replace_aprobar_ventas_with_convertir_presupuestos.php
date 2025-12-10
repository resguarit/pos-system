<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Reemplaza el sistema de aprobación de ventas por conversión de presupuestos.
     * - Elimina: aprobar_ventas
     * - Agrega: convertir_presupuestos
     */
    public function up(): void
    {
        // Crear nuevo permiso para convertir presupuestos
        $existingPermission = DB::table('permissions')
            ->where('name', 'convertir_presupuestos')
            ->first();

        if (!$existingPermission) {
            $newPermissionId = DB::table('permissions')->insertGetId([
                'name' => 'convertir_presupuestos',
                'description' => 'Convertir presupuestos a ventas',
                'module' => 'ventas',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $newPermissionId = $existingPermission->id;
        }

        // Obtener el permiso viejo de aprobar ventas
        $oldPermission = DB::table('permissions')
            ->where('name', 'aprobar_ventas')
            ->first();

        if ($oldPermission) {
            // Transferir asignaciones de rol al nuevo permiso
            $rolePermissions = DB::table('permission_role')
                ->where('permission_id', $oldPermission->id)
                ->get();

            foreach ($rolePermissions as $rp) {
                // Verificar si el rol ya tiene el nuevo permiso
                $exists = DB::table('permission_role')
                    ->where('role_id', $rp->role_id)
                    ->where('permission_id', $newPermissionId)
                    ->exists();

                if (!$exists) {
                    DB::table('permission_role')->insert([
                        'role_id' => $rp->role_id,
                        'permission_id' => $newPermissionId,
                    ]);
                }
            }

            // Eliminar asignaciones del permiso viejo
            DB::table('permission_role')
                ->where('permission_id', $oldPermission->id)
                ->delete();

            // Eliminar el permiso viejo
            DB::table('permissions')
                ->where('id', $oldPermission->id)
                ->delete();
        }

        // También limpiar sales.auto_approve si existe
        $autoApprovePermission = DB::table('permissions')
            ->where('name', 'sales.auto_approve')
            ->first();

        if ($autoApprovePermission) {
            DB::table('permission_role')
                ->where('permission_id', $autoApprovePermission->id)
                ->delete();

            DB::table('permissions')
                ->where('id', $autoApprovePermission->id)
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recrear permiso viejo si se hace rollback
        $exists = DB::table('permissions')
            ->where('name', 'aprobar_ventas')
            ->exists();

        if (!$exists) {
            DB::table('permissions')->insert([
                'name' => 'aprobar_ventas',
                'description' => 'Aprobar ventas pendientes',
                'module' => 'ventas',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Eliminar el nuevo permiso
        $newPermission = DB::table('permissions')
            ->where('name', 'convertir_presupuestos')
            ->first();

        if ($newPermission) {
            DB::table('permission_role')
                ->where('permission_id', $newPermission->id)
                ->delete();

            DB::table('permissions')
                ->where('id', $newPermission->id)
                ->delete();
        }
    }
};
