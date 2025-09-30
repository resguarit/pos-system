<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        // Obtener IDs necesarios
        $categoryIds = DB::table('categories')->pluck('id');
        $supplierIds = DB::table('suppliers')->pluck('id');
        $ivaIds = DB::table('ivas')->pluck('id');
        $measureIds = DB::table('measures')->pluck('id');
        
        // Productos reales de una tienda
        $products = [
            // Productos de almacén
            ['name' => 'Arroz Largo Fino Gallo Oro 1kg', 'code' => 'ARR001'],
            ['name' => 'Fideos Matarazzo Spaghetti 500g', 'code' => 'FID001'],
            ['name' => 'Aceite Girasol Natura 900ml', 'code' => 'ACE001'],
            ['name' => 'Azúcar Ledesma 1kg', 'code' => 'AZU001'],
            ['name' => 'Sal Fina Celusal 1kg', 'code' => 'SAL001'],
            ['name' => 'Harina de Trigo 0000 Pureza 1kg', 'code' => 'HAR001'],
            ['name' => 'Leche Descremada La Serenísima 1L', 'code' => 'LEC001'],
            ['name' => 'Pan Lactal Bimbo Grande', 'code' => 'PAN001'],
            ['name' => 'Yerba Mate Amanda 1kg', 'code' => 'YER001'],
            ['name' => 'Café Instantáneo Nescafé 170g', 'code' => 'CAF001'],
            
            // Productos frescos
            ['name' => 'Banana por kg', 'code' => 'FRU001'],
            ['name' => 'Manzana Roja por kg', 'code' => 'FRU002'],
            ['name' => 'Tomate Redondo por kg', 'code' => 'VER001'],
            ['name' => 'Papa Blanca por kg', 'code' => 'VER002'],
            ['name' => 'Cebolla por kg', 'code' => 'VER003'],
            ['name' => 'Lechuga Criolla por unidad', 'code' => 'VER004'],
            
            // Carnicería
            ['name' => 'Carne Picada Común por kg', 'code' => 'CAR001'],
            ['name' => 'Pechuga de Pollo por kg', 'code' => 'CAR002'],
            ['name' => 'Chorizo Parrillero por kg', 'code' => 'CAR003'],
            ['name' => 'Jamón Cocido por kg', 'code' => 'FIA001'],
            
            // Lácteos
            ['name' => 'Queso Cremoso por kg', 'code' => 'LAC001'],
            ['name' => 'Yogur Danone Vainilla 125g', 'code' => 'LAC002'],
            ['name' => 'Manteca La Serenísima 200g', 'code' => 'LAC003'],
            ['name' => 'Huevos Blancos x12 unidades', 'code' => 'HUE001'],
            
            // Bebidas
            ['name' => 'Coca Cola 2.25L', 'code' => 'BEB001'],
            ['name' => 'Agua Mineral Villavicencio 1.5L', 'code' => 'BEB002'],
            ['name' => 'Cerveza Quilmes 1L', 'code' => 'BEB003'],
            ['name' => 'Vino Tinto Trumpeter 750ml', 'code' => 'BEB004'],
            
            // Limpieza
            ['name' => 'Detergente Skip Limón 500ml', 'code' => 'LIM001'],
            ['name' => 'Lavandina Ayudín 1L', 'code' => 'LIM002'],
            ['name' => 'Papel Higiénico Higienol x4', 'code' => 'LIM003'],
            ['name' => 'Jabón Dove Original 90g', 'code' => 'LIM004'],
            
            // Productos varios
            ['name' => 'Cigarrillos Marlboro Box 20u', 'code' => 'CIG001'],
            ['name' => 'Pilas AA Duracell x4', 'code' => 'ELE001'],
            ['name' => 'Galletitas Oreo 118g', 'code' => 'GAL001'],
            ['name' => 'Chocolate Milka 100g', 'code' => 'CHO001'],
        ];
        
        $records = [];
        foreach ($products as $index => $productData) {
            $records[] = [
                'description' => $productData['name'],
                'code' => rand(1000, 9999), // Código numérico
                'unit_price' => $faker->randomFloat(2, 50, 1000),
                'markup' => $faker->randomFloat(2, 1.1, 3.0), // Markup entre 10% y 200%
                'category_id' => $faker->randomElement($categoryIds),
                'supplier_id' => $faker->randomElement($supplierIds),
                'iva_id' => $faker->randomElement($ivaIds),
                'measure_id' => $faker->randomElement($measureIds),
                'image_id' => null,
                'status' => true,
                'web' => $faker->boolean(50),
                'observaciones' => $faker->optional(0.3)->sentence(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        DB::table('products')->insert($records);
    }
}
