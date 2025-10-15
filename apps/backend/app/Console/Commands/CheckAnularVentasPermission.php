<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;

class CheckAnularVentasPermission extends Command
{
    protected $signature = 'permissions:check-anular-ventas';
    protected $description = 'Verifica qué roles tienen el permiso anular_ventas';

    public function handle()
    {
        $this->info('🔍 Verificando permisos de anular_ventas en todos los roles...');
        $this->newLine();

        $permission = Permission::where('name', 'anular_ventas')->first();

        if (!$permission) {
            $this->error('⚠️  El permiso anular_ventas no existe en la base de datos');
            return 1;
        }

        $this->info("Permiso encontrado: {$permission->name} (ID: {$permission->id})");
        $this->newLine();

        $roles = Role::with('permissions')->get();

        $table = [];
        foreach ($roles as $role) {
            $hasPermission = $role->permissions->contains('name', 'anular_ventas');
            $table[] = [
                $role->id,
                $role->name,
                $hasPermission ? '✅ SÍ' : '❌ NO'
            ];
        }

        $this->table(
            ['ID', 'Rol', 'Tiene anular_ventas'],
            $table
        );

        return 0;
    }
}
