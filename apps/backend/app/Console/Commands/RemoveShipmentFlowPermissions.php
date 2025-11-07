<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RemoveShipmentFlowPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:remove-shipment-flow {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Elimina los permisos relacionados con el flujo de envíos (crear/editar/eliminar etapas, configurar visibilidad, configurar envíos y configurar flujo envío)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres eliminar los permisos del flujo de envíos? Esto eliminará los permisos y sus asignaciones a roles.')) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        $this->info('🗑️  Eliminando permisos del flujo de envíos...');

        try {
            DB::beginTransaction();

            $permissionsToRemove = [
                'crear_etapas_envio',
                'editar_etapas_envio',
                'eliminar_etapas_envio',
                'configurar_visibilidad_atributos',
                'configurar_envios',
                'configurar_flujo_envio',
            ];

            $removedCount = 0;
            $notFoundCount = 0;

            foreach ($permissionsToRemove as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();

                if ($permission) {
                    // Eliminar asignaciones a roles
                    DB::table('permission_role')
                        ->where('permission_id', $permission->id)
                        ->delete();

                    // Eliminar el permiso
                    $permission->delete();
                    $removedCount++;
                    $this->info("   ✅ Eliminado: {$permissionName}");
                } else {
                    $notFoundCount++;
                    $this->warn("   ⚠️  No encontrado: {$permissionName}");
                }
            }

            DB::commit();

            $this->info('');
            $this->info("✅ Proceso completado!");
            $this->info("   - Permisos eliminados: {$removedCount}");
            $this->info("   - Permisos no encontrados: {$notFoundCount}");

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Error al eliminar permisos: ' . $e->getMessage());
            return 1;
        }
    }
}

