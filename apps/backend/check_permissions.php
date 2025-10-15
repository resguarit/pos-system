<?php
/**
 * Script para verificar permisos de anular_ventas en roles
 * Ejecutar con: php check_permissions.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Verificando permisos de 'anular_ventas' en todos los roles...\n\n";

$roles = \App\Models\Role::with('permissions')->get();

foreach ($roles as $role) {
    echo "📋 Rol: {$role->name} (ID: {$role->id})\n";
    
    $hasAnularVentas = $role->permissions->contains('name', 'anular_ventas');
    
    if ($hasAnularVentas) {
        echo "   ✅ Tiene permiso 'anular_ventas'\n";
        
        // Preguntar si quiere removerlo
        echo "   ⚠️  ¿Deseas remover este permiso del rol? (s/n): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        
        if (trim($line) === 's' || trim($line) === 'S') {
            $permission = \App\Models\Permission::where('name', 'anular_ventas')->first();
            if ($permission) {
                $role->permissions()->detach($permission->id);
                echo "   ✅ Permiso removido exitosamente\n";
            }
        } else {
            echo "   ⏭️  Permiso mantenido\n";
        }
    } else {
        echo "   ❌ NO tiene permiso 'anular_ventas'\n";
    }
    echo "\n";
}

echo "\n✅ Verificación completada.\n";
