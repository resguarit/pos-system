<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Categorías de gastos predefinidas para el sistema.
     * Estas categorías cubren los gastos más comunes en negocios.
     */
    public function run(): void
    {
        $categories = [
            // Gastos de Personal
            [
                'name' => 'Sueldos y Salarios',
                'description' => 'Remuneraciones del personal',
                'active' => true,
            ],
            [
                'name' => 'Cargas Sociales',
                'description' => 'Aportes y contribuciones',
                'active' => true,
            ],

            // Gastos Operativos
            [
                'name' => 'Alquiler',
                'description' => 'Alquiler de local',
                'active' => true,
            ],
            [
                'name' => 'Servicios',
                'description' => 'Luz, gas, agua, internet',
                'active' => true,
            ],
            [
                'name' => 'Mantenimiento',
                'description' => 'Reparaciones y limpieza',
                'active' => true,
            ],

            // Gastos Administrativos
            [
                'name' => 'Impuestos',
                'description' => 'Impuestos y tasas municipales/provinciales',
                'active' => true,
            ],
            [
                'name' => 'Insumos',
                'description' => 'Artículos de oficina y limpieza',
                'active' => true,
            ],

            // Gastos de Venta y Transporte
            [
                'name' => 'Publicidad',
                'description' => 'Marketing y redes sociales',
                'active' => true,
            ],
            [
                'name' => 'Fletes y Movilidad',
                'description' => 'Transporte y viáticos',
                'active' => true,
            ],

            // Otros
            [
                'name' => 'Otros Gastos',
                'description' => 'Gastos varios',
                'active' => true,
            ],
        ];

        foreach ($categories as $category) {
            ExpenseCategory::updateOrCreate(
                ['name' => $category['name']],
                $category
            );
        }

        if ($this->command) {
            $this->command->info('✅ Categorías de gastos creadas correctamente');
        }
    }
}
