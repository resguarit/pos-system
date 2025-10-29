# Comandos para Verificar y Ejecutar Migraciones

## 1. Primero, verifica qué migraciones están pendientes

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

php artisan migrate:status
```

Esto te mostrará qué migraciones ya están ejecutadas y cuáles están pendientes.

## 2. Verifica si las tablas de shipments existen

```bash
php artisan tinker
```

Dentro de tinker:
```php
use Illuminate\Support\Facades\Schema;

// Verifica si las tablas existen
Schema::hasTable('shipments') ? "EXISTE shipments" : "NO EXISTE shipments"
Schema::hasTable('shipment_stages') ? "EXISTE shipment_stages" : "NO EXISTE shipment_stages"
Schema::hasTable('shipment_events') ? "EXISTE shipment_events" : "NO EXISTE shipment_events"

exit
```

## 3. Si las tablas NO existen pero las migraciones dicen que ya fueron ejecutadas

Esto significa que el registro de la migración está en la base de datos pero las tablas no se crearon correctamente.

### Opción A: Revertir las migraciones de shipments y volver a ejecutarlas

```bash
# Ver qué migraciones de shipments ya están registradas
php artisan migrate:status | grep shipment

# Borrar el registro de las migraciones de shipments
php artisan migrate:rollback --step=10

# O borrar manualmente el registro específico de shipments
php artisan tinker
```

Dentro de tinker:
```php
use Illuminate\Support\Facades\DB;

// Listar las migraciones de shipments
DB::table('migrations')->where('migration', 'like', '%shipment%')->get();

// Eliminar el registro de la migración que acabamos de crear
DB::table('migrations')->where('migration', '2025_10_28_215648_create_shipment_system_tables')->delete();

exit
```

### Opción B: Ejecutar solo la migración específica

```bash
# Forzar la ejecución de una migración específica
php artisan migrate --path=database/migrations/2025_10_28_215648_create_shipment_system_tables.php
```

## 4. Si dice "Nothing to migrate" pero las tablas no existen

```bash
# Forzar ejecución de TODAS las migraciones (incluye las ya ejecutadas)
php artisan migrate --force
```

## 5. Verificar que las tablas se crearon correctamente

```bash
php artisan migrate:status
```

Debe mostrar que la migración `2025_10_28_215648_create_shipment_system_tables.php` está como "Ran".

## 6. Si aún hay problemas

Usa este comando SQL directo para ver si las tablas existen:

```bash
php artisan tinker
```

```php
use Illuminate\Support\Facades\DB;

// Ver todas las tablas que empiezan con "shipment"
DB::select("SHOW TABLES LIKE 'shipment%'");

exit
```

Si las tablas no existen pero la migración dice que está ejecutada, ejecuta:

```bash
php artisan migrate:rollback
php artisan migrate
```

