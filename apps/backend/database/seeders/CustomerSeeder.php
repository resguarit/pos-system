<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        // Obtener todas las personas disponibles
        $personIds = DB::table('people')->pluck('id');
        
        $records = [];
        $usedPersons = [];
        
        // Crear 10 clientes, cada uno con una persona diferente
        for ($i = 0; $i < min(10, count($personIds)); $i++) {
            // Seleccionar una persona que no haya sido usada
            do {
                $personId = $faker->randomElement($personIds);
            } while (in_array($personId, $usedPersons));
            
            $usedPersons[] = $personId;
            
            $records[] = [
                'person_id' => $personId,
                'email' => $faker->optional(0.7)->email(),
                'active' => $faker->boolean(90), // 90% probabilidad de estar activo
                'notes' => $faker->optional(0.3)->sentence(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        DB::table('customers')->insert($records);
    }
}
