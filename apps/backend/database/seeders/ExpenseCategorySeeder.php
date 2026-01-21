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
        // Limpiar categorías existentes (opcional, pero útil para evitar duplicados si se corre varias veces en dev)
        // ExpenseCategory::query()->delete(); 

        $categories = [
            // Gastos de Personal (👥)
            [
                'name' => 'Gastos de Personal',
                'description' => 'Sueldos, cargas sociales y beneficios',
                'icon' => '👥',
                'active' => true,
                'children' => [
                    ['name' => 'Sueldos y Salarios', 'description' => 'Pago mensual de nómina', 'icon' => '💰'],
                    ['name' => 'Cargas Sociales', 'description' => 'Aportes y contribuciones patronales', 'icon' => '📄'],
                    ['name' => 'Horas Extra', 'description' => 'Pago de horas adicionales', 'icon' => '⏰'],
                    ['name' => 'Adadelantos', 'description' => 'Adelantos de sueldo', 'icon' => '💸'],
                    ['name' => 'Viáticos y Movilidad', 'description' => 'Reintegro de gastos de viaje', 'icon' => '🚌'],
                ]
            ],

            // Gastos Operativos (🏢)
            [
                'name' => 'Gastos Operativos',
                'description' => 'Gastos relacionados al funcionamiento del local',
                'icon' => '🏢',
                'active' => true,
                'children' => [
                    ['name' => 'Alquiler', 'description' => 'Alquiler del local comercial/oficina', 'icon' => '🏠'],
                    ['name' => 'Expensas', 'description' => 'Gastos comunes del edificio/predio', 'icon' => '🏢'],
                    ['name' => 'Mantenimiento y Reparaciones', 'description' => 'Arreglos generales y mantenimiento', 'icon' => '🔧'],
                    ['name' => 'Limpieza', 'description' => 'Insumos y servicios de limpieza', 'icon' => '🧹'],
                    ['name' => 'Seguridad', 'description' => 'Servicios de vigilancia y alarmas', 'icon' => 'security'],
                ]
            ],

            // Servicios (⚡)
            [
                'name' => 'Servicios',
                'description' => 'Servicios básicos y conectividad',
                'icon' => '⚡',
                'active' => true,
                'children' => [
                    ['name' => 'Electricidad', 'description' => 'Factura de luz', 'icon' => '💡'],
                    ['name' => 'Gas', 'description' => 'Factura de gas', 'icon' => '🔥'],
                    ['name' => 'Agua', 'description' => 'Factura de agua', 'icon' => '💧'],
                    ['name' => 'Internet y Telefonía', 'description' => 'Conectividad y comunicaciones', 'icon' => '📶'],
                    ['name' => 'Hosting y Software', 'description' => 'Suscripciones digitales y servidores', 'icon' => '☁️'],
                ]
            ],

            // Impuestos y Tasas (⚖️)
            [
                'name' => 'Impuestos y Tasas',
                'description' => 'Obligaciones tributarias',
                'icon' => '⚖️',
                'active' => true,
                'children' => [
                    ['name' => 'Monotributo / Autónomos', 'description' => 'Pago mensual a AFIP', 'icon' => '🏛️'],
                    ['name' => 'Ingresos Brutos', 'description' => 'Impuesto provincial', 'icon' => '📉'],
                    ['name' => 'Tasas Municipales', 'description' => 'ABL y Seguridad e Higiene', 'icon' => '🏙️'],
                    ['name' => 'Honorarios Contador', 'description' => 'Servicios contables', 'icon' => '👨‍💼'],
                ]
            ],

            // Gastos de Venta y Marketing (📢)
            [
                'name' => 'Marketing y Ventas',
                'description' => 'Promoción y costos de venta',
                'icon' => '📢',
                'active' => true,
                'children' => [
                    ['name' => 'Publicidad Online', 'description' => 'Facebook Ads, Google Ads, Instagram', 'icon' => '📱'],
                    ['name' => 'Publicidad Tradicional', 'description' => 'Folletos, carteles, radio', 'icon' => '📰'],
                    ['name' => 'Packaging', 'description' => 'Bolsas, cajas y envoltorios', 'icon' => '📦'],
                    ['name' => 'Comisiones Bancarias', 'description' => 'Costos de cuentas y tarjetas', 'icon' => '💳'],
                ]
            ],

            // Insumos y Mercadería (📦)
            [
                'name' => 'Insumos y Materiales',
                'description' => 'Compras necesarias para operar',
                'icon' => '📦',
                'active' => true,
                'children' => [
                    ['name' => 'Artículos de Oficina', 'description' => 'Papelería, tinta, etc.', 'icon' => '📎'],
                    ['name' => 'Insumos de Producción', 'description' => 'Materia prima indirecta', 'icon' => '🏭'],
                    ['name' => 'Herramientas', 'description' => 'Herramientas de trabajo', 'icon' => '🔨'],
                ]
            ],

            // Otros (📋)
            [
                'name' => 'Otros Gastos',
                'description' => 'Gastos varios no categorizados',
                'icon' => '📋',
                'active' => true,
                'children' => [
                    ['name' => 'Varios', 'description' => 'Gastos menores', 'icon' => '📝'],
                ]
            ],
        ];

        foreach ($categories as $categoryData) {
            $children = $categoryData['children'] ?? [];
            unset($categoryData['children']);

            // Crear o actualizar categoría padre
            $parent = ExpenseCategory::updateOrCreate(
                ['name' => $categoryData['name']],
                $categoryData
            );

            // Crear o actualizar hijos
            foreach ($children as $childData) {
                $childData['parent_id'] = $parent->id;
                $childData['active'] = true;

                ExpenseCategory::updateOrCreate(
                    ['name' => $childData['name'], 'parent_id' => $parent->id],
                    $childData
                );
            }
        }

        if ($this->command) {
            $this->command->info('✅ Categorías de gastos jerárquicas creadas correctamente');
        }
    }
}
