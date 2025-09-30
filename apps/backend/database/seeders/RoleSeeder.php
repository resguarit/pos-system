<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Administrador',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Cajero',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Supervisor',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Vendedor',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Deposito',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Gerente',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Contador',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ];

        // Usar firstOrCreate para evitar duplicados
        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );
        }
    }
}
