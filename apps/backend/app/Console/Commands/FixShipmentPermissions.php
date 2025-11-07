<?php

namespace App\Console\Commands;

use App\Models\Permission;
use Illuminate\Console\Command;

class FixShipmentPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:fix-shipments {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige los permisos de envíos: actualiza el módulo a "shipments" y ejecuta el seeder';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres corregir los permisos de envíos?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        $this->info('🔧 Corrigiendo permisos de envíos...');

        try {
            // 1. Actualizar módulo de permisos existentes
            $this->info('📝 Actualizando módulo de permisos existentes...');
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

            $this->info("   ✅ {$updated} permisos actualizados");

            // 2. Ejecutar el seeder
            $this->info('🌱 Ejecutando seeder de permisos de envíos...');
            $this->call('db:seed', ['--class' => 'ShipmentPermissionSeeder', '--force' => true]);

            // 3. Verificar que todos los permisos estén correctos
            $this->info('🔍 Verificando permisos...');
            $permissions = Permission::where('module', 'envios')
                ->orderBy('name')
                ->get(['id', 'name', 'module']);

            $this->info("   Total permisos de envíos: {$permissions->count()} (debería ser 6)");

            $expected = $permissionNames;
            $missing = [];
            foreach ($expected as $name) {
                $perm = $permissions->firstWhere('name', $name);
                if ($perm) {
                    $this->info("   ✅ {$name}");
                } else {
                    $this->warn("   ❌ {$name} (FALTA)");
                    $missing[] = $name;
                }
            }

            if (empty($missing)) {
                $this->info('✅ Todos los permisos de envíos están correctos!');
            } else {
                $this->warn("⚠️  Faltan " . count($missing) . " permisos. Ejecuta el seeder manualmente.");
            }

            // 4. Limpiar caché
            $this->info('🧹 Limpiando caché...');
            $this->call('config:clear');
            $this->call('cache:clear');
            $this->call('route:clear');
            $this->call('view:clear');

            $this->info('✅ Proceso completado!');
            $this->info('');
            $this->info('💡 Próximos pasos:');
            $this->info('   1. Verifica en la interfaz web que los permisos aparezcan');
            $this->info('   2. Si el frontend no está actualizado, ejecuta: npm run build');
            $this->info('   3. Limpia la caché del navegador (Ctrl+Shift+R)');

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error al corregir permisos: ' . $e->getMessage());
            return 1;
        }
    }
}

