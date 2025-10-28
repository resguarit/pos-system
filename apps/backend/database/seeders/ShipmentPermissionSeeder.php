<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class ShipmentPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            [
                'name' => 'ver_envios',
                'description' => 'Ver envíos',
                'module' => 'shipments',
            ],
            [
                'name' => 'crear_envios',
                'description' => 'Crear nuevos envíos',
                'module' => 'shipments',
            ],
            [
                'name' => 'editar_envios',
                'description' => 'Editar envíos existentes',
                'module' => 'shipments',
            ],
            [
                'name' => 'cancelar_envio',
                'description' => 'Cancelar envíos',
                'module' => 'shipments',
            ],
            [
                'name' => 'registrar_pago_envio',
                'description' => 'Registrar pago de envío',
                'module' => 'shipments',
            ],
            [
                'name' => 'imprimir_etiqueta_envio',
                'description' => 'Imprimir etiquetas de envío',
                'module' => 'shipments',
            ],
            [
                'name' => 'configurar_envios',
                'description' => 'Configurar envíos',
                'module' => 'shipments',
            ],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                $permission
            );
        }
    }
}
