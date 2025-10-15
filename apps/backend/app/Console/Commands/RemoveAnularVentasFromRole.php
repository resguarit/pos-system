<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;

class RemoveAnularVentasFromRole extends Command
{
    protected $signature = 'permissions:remove-anular-ventas {role}';
    protected $description = 'Remueve el permiso anular_ventas de un rol específico';

    public function handle()
    {
        $roleName = $this->argument('role');
        
        $role = Role::where('name', $roleName)->first();
        
        if (!$role) {
            $this->error("❌ El rol '{$roleName}' no existe");
            return 1;
        }

        $permission = Permission::where('name', 'anular_ventas')->first();

        if (!$permission) {
            $this->error('❌ El permiso anular_ventas no existe');
            return 1;
        }

        $hasPermission = $role->permissions->contains('name', 'anular_ventas');

        if (!$hasPermission) {
            $this->info("ℹ️  El rol '{$roleName}' no tiene el permiso anular_ventas");
            return 0;
        }

        $role->permissions()->detach($permission->id);

        $this->info("✅ Permiso 'anular_ventas' removido del rol '{$roleName}' exitosamente");
        
        return 0;
    }
}
