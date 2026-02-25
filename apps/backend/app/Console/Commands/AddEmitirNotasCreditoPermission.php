<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\Artisan;

class AddEmitirNotasCreditoPermission extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:add-emitir-notas-credito';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates the emitir notas de credito permission and assigns it to Admin and Dueño roles.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $permissionName = 'emitir_notas_credito';
        $permissionModule = 'ventas';
        $permissionDescription = 'Emitir notas de crédito desde el historial de ventas o presupuestos';

        // 1. Check or create the permission
        $permission = Permission::where('name', $permissionName)->first();
        if (!$permission) {
            $permission = Permission::create([
                'name' => $permissionName,
                'guard_name' => 'api',
                'module' => $permissionModule,
                'description' => $permissionDescription
            ]);
            $this->info("Permission '{$permissionName}' created successfully.");
        } else {
            $permission->update([
                'module' => $permissionModule,
                'description' => $permissionDescription
            ]);
            $this->warn("Permission '{$permissionName}' already exists, updated description and module.");
        }

        // 2. Assign to Admin and Dueño
        $rolesToUpdate = ['Administrador', 'Dueño', 'Developer'];
        foreach ($rolesToUpdate as $roleName) {
            $roleData = \Illuminate\Support\Facades\DB::table('roles')->where('name', $roleName)->first();
            if ($roleData) {
                // Check if already assigned
                $hasPermission = \Illuminate\Support\Facades\DB::table('permission_role')
                    ->where('permission_id', $permission->id)
                    ->where('role_id', $roleData->id)
                    ->exists();

                if (!$hasPermission) {
                    \Illuminate\Support\Facades\DB::table('permission_role')->insert([
                        'permission_id' => $permission->id,
                        'role_id' => $roleData->id
                    ]);
                    $this->info("Permission assigned to role: {$roleName}");
                } else {
                    $this->warn("Role {$roleName} already has the permission.");
                }
            } else {
                $this->error("Role {$roleName} not found in database.");
            }
        }

        // 3. Clear cache
        Artisan::call('cache:forget spatie.permission.cache');
        $this->info('Done! Permission cache cleared.');

        return Command::SUCCESS;
    }
}
