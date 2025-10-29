# Comandos Finales para Ejecutar en el Servidor

## 1. Pull del código actualizado

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
git pull origin master
```

## 2. Ejecutar la migración que renombra la columna

```bash
php artisan migrate
```

Esto debería renombrar `active` a `is_active` en la tabla `shipment_stages`.

## 3. Ahora sí, crear los stages

```bash
php artisan tinker
```

Dentro de tinker:
```php
use App\Models\ShipmentStage;

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

echo "✅ Stages creados\n";

exit
```

## 4. Limpiar caché

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## 5. Listo! ✅

Ahora los errores 500 en shipments deberían desaparecer.
