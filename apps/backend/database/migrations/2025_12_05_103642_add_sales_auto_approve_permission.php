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
        // 1. Crear el permiso
        $permission = \App\Models\Permission::firstOrCreate(
            ['name' => 'sales.auto_approve'],
            [
                'description' => 'Aprobar ventas automáticamente sin revisión',
                'module' => 'ventas'
            ]
        );

        // 2. Asignar a roles Admin y Manager (ajustar nombres según DB)
        $roles = \App\Models\Role::whereIn('name', ['Admin', 'Manager', 'Administrador', 'Gerente'])->get();
        
        foreach ($roles as $role) {
            // Verificar si ya tiene el permiso para evitar duplicados
            if (!$role->permissions()->where('name', 'sales.auto_approve')->exists()) {
                $role->permissions()->attach($permission->id);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = \App\Models\Permission::where('name', 'sales.auto_approve')->first();
        
        if ($permission) {
            // Desvincular de roles
            $permission->roles()->detach();
            // Eliminar permiso
            $permission->delete();
        }
    }
};
