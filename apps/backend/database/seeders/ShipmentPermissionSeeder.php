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
                'module' => 'envios',
            ],
            [
                'name' => 'crear_envios',
                'description' => 'Crear nuevos envíos',
                'module' => 'envios',
            ],
            [
                'name' => 'editar_envios',
                'description' => 'Editar envíos existentes',
                'module' => 'envios',
            ],
            [
                'name' => 'cancelar_envio',
                'description' => 'Cancelar envíos',
                'module' => 'envios',
            ],
            [
                'name' => 'gestionar_envios',
                'description' => 'Gestionar estados/etapas de envíos',
                'module' => 'envios',
            ],
            [
                'name' => 'registrar_pago_envio',
                'description' => 'Registrar pago de envío',
                'module' => 'envios',
            ],
            [
                'name' => 'imprimir_etiqueta_envio',
                'description' => 'Imprimir etiquetas de envío',
                'module' => 'envios',
            ],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission['name']],
                $permission
            );
        }
    }
}
