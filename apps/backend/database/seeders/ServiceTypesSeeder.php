<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceType;
use Illuminate\Support\Facades\DB;

class ServiceTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('service_types')->delete();

        $services = [
            [
                'name' => 'Hosting Web',
                'description' => 'Servicio de alojamiento web con panel cPanel',
                'price' => 15.00,
                'billing_cycle' => 'monthly',
                'icon' => 'server',
                'is_active' => true,
            ],
            [
                'name' => 'Dominio',
                'description' => 'Registro y renovación de dominio',
                'price' => 25.00,
                'billing_cycle' => 'annual',
                'icon' => 'globe',
                'is_active' => true,
            ],
            [
                'name' => 'SSL Certificado',
                'description' => 'Certificado SSL para seguridad web',
                'price' => 10.00,
                'billing_cycle' => 'annual',
                'icon' => 'lock',
                'is_active' => true,
            ],
            [
                'name' => 'Soporte Técnico',
                'description' => 'Soporte técnico mensual',
                'price' => 50.00,
                'billing_cycle' => 'monthly',
                'icon' => 'wrench',
                'is_active' => true,
            ],
            [
                'name' => 'VPS',
                'description' => 'Servidor Virtual Privado',
                'price' => 80.00,
                'billing_cycle' => 'monthly',
                'icon' => 'server',
                'is_active' => true,
            ],
        ];

        foreach ($services as $service) {
            ServiceType::create($service);
        }
    }
}
