<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentMethodPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            [
                'name' => 'ver_metodos_pago',
                'description' => 'Ver métodos de pago',
                'module' => 'metodos_pago',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'crear_metodos_pago',
                'description' => 'Crear métodos de pago',
                'module' => 'metodos_pago',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'editar_metodos_pago',
                'description' => 'Editar métodos de pago',
                'module' => 'metodos_pago',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'eliminar_metodos_pago',
                'description' => 'Eliminar métodos de pago',
                'module' => 'metodos_pago',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $permission['name']],
                $permission
            );
        }

        // Assign all permissions to admin role (id = 1)
        $adminRoleId = DB::table('roles')->where('name', 'Administrador')->value('id') ?? 1;

        $permissionIds = DB::table('permissions')
            ->whereIn('name', ['ver_metodos_pago', 'crear_metodos_pago', 'editar_metodos_pago', 'eliminar_metodos_pago'])
            ->pluck('id');

        foreach ($permissionIds as $permissionId) {
            $exists = DB::table('permission_role')
                ->where('role_id', $adminRoleId)
                ->where('permission_id', $permissionId)
                ->exists();

            if (!$exists) {
                DB::table('permission_role')->insert([
                    'role_id' => $adminRoleId,
                    'permission_id' => $permissionId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('Payment method permissions created and assigned to admin role successfully!');
    }
}
