<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class RefreshUserPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:refresh-permissions {email : Email del usuario}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Refrescar permisos de un usuario específico';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $user = User::where('email', $email)->with(['role', 'role.permissions'])->first();
        
        if (!$user) {
            $this->error("Usuario no encontrado con email: {$email}");
            return 1;
        }

        $this->info("Usuario encontrado: {$user->email}");
        $this->info("Rol: " . ($user->role ? $user->role->name : 'Sin rol'));
        
        if ($user->role && $user->role->permissions) {
            $permissions = $user->role->permissions->pluck('name')->toArray();
            $this->info("Total de permisos: " . count($permissions));
            
            $userPermissions = array_filter($permissions, function($perm) {
                return strpos($perm, 'usuario') !== false || strpos($perm, 'estadisticas') !== false;
            });
            
            $this->info("Permisos relevantes:");
            foreach ($userPermissions as $perm) {
                $this->line("- {$perm}");
            }
            
            // Limpiar cache si existe
            Cache::forget("user_permissions_{$user->id}");
            
            $this->info("✅ Permisos del usuario verificados correctamente");
            $this->info("💡 Recomendación: El usuario debe cerrar sesión y volver a iniciar sesión para que se carguen los permisos actualizados");
            
        } else {
            $this->error("El usuario no tiene rol o permisos asignados");
            return 1;
        }
    }
}
