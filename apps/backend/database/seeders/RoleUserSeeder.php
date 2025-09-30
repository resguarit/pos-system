<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = DB::table('users')->pluck('id');
        $roles = DB::table('roles')->pluck('id');

        $records = [];
        foreach ($users as $userId) {
            // Asignar al menos un rol a cada usuario
            $assignedRoles = [];
            $numRoles = rand(1, 2); // Cada usuario tiene 1 o 2 roles máximo
            
            for ($i = 0; $i < $numRoles; $i++) {
                $roleId = $roles->random();
                
                // Evitar duplicados para el mismo usuario
                if (!in_array($roleId, $assignedRoles)) {
                    $assignedRoles[] = $roleId;
                    $records[] = [
                        'user_id' => $userId,
                        'role_id' => $roleId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        DB::table('role_user')->insert($records);
    }
}
