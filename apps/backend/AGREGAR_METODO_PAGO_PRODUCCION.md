# Agregar Método de Pago "Cuenta Corriente" en Producción

## Problema
El método de pago "Cuenta Corriente" no aparece en producción porque fue agregado recientemente al código, pero el seeder no se ha ejecutado en la base de datos de producción.

## Solución

Se ha creado un comando Artisan específico para actualizar los métodos de pago de forma segura:

```bash
php artisan db:seed:payment-methods
```

### Ejecutar sin confirmación (útil para scripts):
```bash
php artisan db:seed:payment-methods --force
```

## ¿Qué hace este comando?

El comando ejecuta el `PaymentMethodSeeder` que:
- ✅ Agrega el método de pago "Cuenta Corriente" si no existe
- ✅ Actualiza los métodos de pago existentes
- ✅ Mantiene los métodos de pago ya creados (no los elimina ni duplica)

### Métodos de pago que se actualizarán/crearán:

1. **Efectivo** - `affects_cash: true`
2. **Tarjeta de crédito** - `affects_cash: true`
3. **Tarjeta de débito** - `affects_cash: true`
4. **Transferencia** - `affects_cash: true`
5. **Cuenta Corriente** - `affects_cash: false` ⭐ (nuevo)

## Pasos para ejecutar en producción:

1. Conectarse al servidor de producción
2. Navegar al directorio del backend:
   ```bash
   cd /ruta/al/proyecto/apps/backend
   ```
3. Ejecutar el comando:
   ```bash
   php artisan db:seed:payment-methods --force
   ```
4. Verificar que el método de pago se haya agregado correctamente

## Verificación

Después de ejecutar el comando, puedes verificar en la base de datos:

```sql
SELECT * FROM payment_methods WHERE name = 'Cuenta Corriente';
```

O verificar desde el frontend que el método de pago aparezca en el dropdown al completar una venta.

## Alternativa: Ejecutar todo el seeder de producción

Si prefieres ejecutar todos los seeders de producción (incluye métodos de pago):

```bash
php artisan db:seed:production --force
```

**Nota:** Esto ejecutará todos los seeders de producción, no solo el de métodos de pago. El comando específico `db:seed:payment-methods` es más seguro y preciso para este caso.

