# Comandos para Ejecutar en el Servidor

## 1. Restaurar las cuentas corrientes (están marcadas como "borradas")

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

php artisan tinker
```

Dentro de tinker:
```php
use Illuminate\Support\Facades\DB;
DB::table('current_accounts')->whereNotNull('deleted_at')->update(['deleted_at' => null]);
exit
```

## 2. Corregir el estado de pagos de las ventas antiguas

```bash
php artisan sales:fix-payment-status
```

Este comando:
- Busca todas las ventas
- Suma los pagos en `sale_payments`
- Actualiza `payment_status` correctamente:
  - 'paid' si pagos >= total
  - 'partial' si 0 < pagos < total
  - 'pending' si pagos = 0

## 3. Ejecutar migraciones (crear tablas de shipments)

```bash
php artisan migrate
```

**IMPORTANTE:** Esto creará las tablas `shipment_stages`, `shipments`, `shipment_events`, etc.

## 4. Corregir el estado de pagos de las ventas antiguas

```bash
php artisan sales:fix-payment-status
```

## 5. Limpiar caché

```bash
php artisan config:clear && php artisan cache:clear
```

## Resultado

Después de ejecutar estos comandos:
- ✅ Se crean las tablas de shipments (elimina errores 500 en envíos)
- ✅ Las ventas que ya estaban pagadas desaparecerán de las cuentas corrientes
- ✅ Solo quedarán las ventas que REALMENTE están pendientes
- ✅ El "Total Pendiente de Cobro" y las deudas individuales se reducirán a 0

## Nota

Las nuevas ventas ya se crean correctamente con el `payment_status` correcto gracias a la corrección en `PosController.php`.


