<?php

namespace App\Console\Commands;

use App\Models\Permission;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixShipmentPermissionsProduction extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:fix-shipments-production {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige todos los permisos de envíos: cambia módulo a "envios" y elimina permisos no utilizados';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres corregir los permisos de envíos en producción? Esto actualizará módulos y eliminará permisos no utilizados.')) {
                $this->info('Operación cancelada.');
                return 0;
            }
        }

        $this->info('🚀 Iniciando corrección completa de permisos de envíos...');
        $this->newLine();

        try {
            DB::beginTransaction();

            // 1. Actualizar módulo de permisos existentes de "shipments" a "envios"
            $this->info('📝 Paso 1: Actualizando módulo de permisos de "shipments" a "envios"...');
            $permissionNames = [
                'ver_envios',
                'crear_envios',
                'editar_envios',
                'cancelar_envio',
                'registrar_pago_envio',
                'imprimir_etiqueta_envio',
            ];

            $updated = Permission::whereIn('name', $permissionNames)
                ->where(function ($query) {
                    $query->where('module', '!=', 'envios')
                        ->orWhereNull('module');
                })
                ->update(['module' => 'envios']);

            $this->info("   ✅ {$updated} permisos actualizados al módulo 'envios'");
            $this->newLine();

            // 2. Ejecutar el seeder para asegurar que todos los permisos existan con el módulo correcto
            $this->info('🌱 Paso 2: Ejecutando seeder de permisos de envíos...');
            $this->call('db:seed', ['--class' => 'ShipmentPermissionSeeder', '--force' => true]);
            $this->info('   ✅ Seeder ejecutado');
            $this->newLine();

            // 3. Eliminar permisos no utilizados del flujo de envíos
            $this->info('🗑️  Paso 3: Eliminando permisos no utilizados...');
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

            $this->newLine();
            $this->info("   📊 Resumen de eliminación:");
            $this->info("      - Permisos eliminados: {$removedCount}");
            $this->info("      - Permisos no encontrados: {$notFoundCount}");
            $this->newLine();

            // 4. Verificar que todos los permisos de envíos estén correctos
            $this->info('🔍 Paso 4: Verificando permisos de envíos...');
            $permissions = Permission::where('module', 'envios')
                ->orderBy('name')
                ->get(['id', 'name', 'module']);

            $this->info("   Total permisos de envíos: {$permissions->count()} (debería ser 6)");
            $this->newLine();

            $expected = $permissionNames;
            $missing = [];
            foreach ($expected as $name) {
                $perm = $permissions->firstWhere('name', $name);
                if (!$perm) {
                    $missing[] = $name;
                }
            }

            if (empty($missing)) {
                $this->info('   ✅ Todos los permisos de envíos están presentes');
            } else {
                $this->warn('   ⚠️  Faltan permisos: ' . implode(', ', $missing));
            }

            $this->newLine();
            $this->info('   📋 Permisos de envíos actuales:');
            foreach ($permissions as $perm) {
                $this->info("      - {$perm->name} (módulo: {$perm->module})");
            }

            $this->newLine();

            // 5. Limpiar caché
            $this->info('🧹 Paso 5: Limpiando caché...');
            $this->call('config:clear');
            $this->call('cache:clear');
            $this->call('route:clear');
            $this->call('view:clear');
            $this->info('   ✅ Caché limpiada');
            $this->newLine();

            DB::commit();

            $this->info('✅ ¡Corrección completa de permisos de envíos finalizada exitosamente!');
            $this->newLine();
            $this->info('📝 Resumen final:');
            $this->info('   - Módulo actualizado: "shipments" → "envios"');
            $this->info('   - Permisos válidos: 6');
            $this->info('   - Permisos eliminados: ' . $removedCount);
            $this->newLine();

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Error al corregir permisos de envíos: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }
    }
}

