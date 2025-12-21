<?php

namespace Database\Seeders;

use App\Models\ShipmentStage;
use Illuminate\Database\Seeder;

class ShipmentStageSeeder extends Seeder
{
    /**
     * Estados básicos de envío para producción.
     * Estos estados son esenciales para el funcionamiento del módulo de envíos.
     */
    public function run(): void
    {
        $stages = [
            [
                'name' => 'Preparación',
                'description' => 'Envío en preparación',
                'order' => 1,
                'color' => '#fbbf24',
                'icon' => 'package',
                'is_active' => true,
                'is_initial' => true,
                'is_final' => false,
            ],
            [
                'name' => 'En Ruta',
                'description' => 'Envío en camino',
                'order' => 2,
                'color' => '#3b82f6',
                'icon' => 'truck',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => false,
            ],
            [
                'name' => 'Entregado',
                'description' => 'Envío entregado',
                'order' => 3,
                'color' => '#10b981',
                'icon' => 'check-circle',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => true,
            ],
            [
                'name' => 'Cancelado',
                'description' => 'Envío cancelado',
                'order' => 4,
                'color' => '#ef4444',
                'icon' => 'x-circle',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => true,
            ],
        ];

        foreach ($stages as $stageData) {
            ShipmentStage::firstOrCreate(
                ['name' => $stageData['name']],
                $stageData
            );
        }

        if ($this->command) {
            $this->command->info('📦 Estados de envío creados correctamente');
        }
    }
}
