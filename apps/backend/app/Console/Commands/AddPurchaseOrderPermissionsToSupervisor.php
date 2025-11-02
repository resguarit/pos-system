<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Permission;
use App\Models\Role;

class AddPurchaseOrderPermissionsToSupervisor extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:add-purchase-order-to-supervisor';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Agrega los permisos completar_ordenes_compra y cancelar_ordenes_compra al rol Supervisor. Asegura que Admin tenga todos los permisos. NO modifica otros permisos de ningún rol.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Agregando permisos de órdenes de compra...');

        try {
            // 1. Asegurar que Admin tenga todos los permisos
            $admin = Role::where('name', 'Admin')->first();
            if ($admin) {
                $allPermissions = Permission::all();
                $admin->permissions()->sync($allPermissions->pluck('id'));
                $this->info("✅ Admin: Asignados todos los permisos (" . $allPermissions->count() . " permisos)");
            } else {
                $this->warn("⚠️  Rol 'Admin' no encontrado");
            }

            // 2. Agregar los dos permisos nuevos al Supervisor SIN tocar los demás
            $supervisor = Role::where('name', 'Supervisor')->first();
            if ($supervisor) {
                $permissionsToAdd = Permission::whereIn('name', [
                    'completar_ordenes_compra',
                    'cancelar_ordenes_compra'
                ])->get();

                if ($permissionsToAdd->count() === 0) {
                    $this->error("❌ No se encontraron los permisos 'completar_ordenes_compra' y 'cancelar_ordenes_compra'. Asegúrate de ejecutar primero PermissionSeeder.");
                    return 1;
                }

                $currentCount = $supervisor->permissions->count();
                
                // Usar syncWithoutDetaching para agregar sin quitar los existentes
                $supervisor->permissions()->syncWithoutDetaching($permissionsToAdd->pluck('id'));
                
                $newCount = $supervisor->fresh()->permissions->count();
                $added = $newCount - $currentCount;

                if ($added > 0) {
                    $this->info("✅ Supervisor: Agregados {$added} permisos nuevos");
                    $this->info("   - Total de permisos del Supervisor: {$newCount}");
                } else {
                    $this->info("ℹ️  Supervisor: Los permisos ya estaban asignados");
                }

                // Mostrar los permisos agregados
                foreach ($permissionsToAdd as $permission) {
                    $this->info("   + {$permission->name}");
                }
            } else {
                $this->warn("⚠️  Rol 'Supervisor' no encontrado");
            }

            $this->info('✅ Proceso completado exitosamente!');
            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            return 1;
        }
    }
}

