# Solución para Errores 500 en Shipments

Las tablas **YA EXISTEN** (shipments, shipment_stages). El problema es que están vacías.

## 1. Verifica si hay datos en las tablas

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

php artisan tinker
```

Dentro de tinker:
```php
use Illuminate\Support\Facades\DB;

// Contar registros
DB::table('shipment_stages')->count() . " stages"
DB::table('shipments')->count() . " shipments"

exit
```

Si ambos dan `0`, necesitas ejecutar el seeder.

## 2. Ejecutar el seeder de shipment_stages

```bash
php artisan db:seed --class=ShipmentStageSeeder
```

Si ese seeder no existe, crea uno temporalmente o inserta manualmente:

```bash
php artisan tinker
```

Dentro de tinker:
```php
use App\Models\ShipmentStage;

// Crear stages básicos
$stages = [
    ['name' => 'Pendiente', 'description' => 'Envío pendiente de iniciar', 'order' => 1, 'is_active' => true],
    ['name' => 'En Preparación', 'description' => 'Preparando el envío', 'order' => 2, 'is_active' => true],
    ['name' => 'En Camino', 'description' => 'Enviado y en ruta', 'order' => 3, 'is_active' => true],
    ['name' => 'Entregado', 'description' => 'Entregado al cliente', 'order' => 4, 'is_active' => true],
    ['name' => 'Cancelado', 'description' => 'Cancelado', 'order' => 999, 'is_active' => true],
];

foreach ($stages as $stage) {
    ShipmentStage::create($stage);
}

echo "Stages creados\n";

exit
```

## 3. Verificar permisos de shipments

```bash
php artisan permissions:refresh
```

## 4. Limpiar caché

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## 5. Probar el endpoint

Ahora debería funcionar sin errores 500.

