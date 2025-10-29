# Soluciones para Producción: Métodos de Pago y Tipos de Movimiento

## Problema 1: Método de Pago "Cuenta Corriente" Faltante

El método de pago "Cuenta Corriente" no aparece en producción porque fue agregado recientemente al código, pero el seeder no se ha ejecutado en la base de datos de producción.

## Problema 2: Error "Tipo de movimiento 'Venta' no encontrado"

Al crear una venta con cliente (con cualquier método de pago), aparece el error: `Error al registrar movimientos en cuenta corriente: Tipo de movimiento "Venta" no encontrado.`

Esto ocurre porque los tipos de movimiento necesarios para cuenta corriente no están en la base de datos de producción.

## Soluciones

### 1. Agregar Método de Pago "Cuenta Corriente"

Se ha creado un comando Artisan específico para actualizar los métodos de pago de forma segura:

```bash
php artisan db:seed:payment-methods
```

### Ejecutar sin confirmación (útil para scripts):
```bash
php artisan db:seed:payment-methods --force
```

#### ¿Qué hace este comando?

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

---

### 2. Agregar Tipos de Movimiento para Cuenta Corriente

Se ha creado un comando Artisan específico para actualizar los tipos de movimiento de forma segura:

```bash
php artisan db:seed:movement-types
```

#### Ejecutar sin confirmación (útil para scripts):
```bash
php artisan db:seed:movement-types --force
```

#### ¿Qué hace este comando?

El comando ejecuta el `MovementTypeSeeder` que:
- ✅ Agrega los tipos de movimiento faltantes si no existen
- ✅ Actualiza los tipos de movimiento existentes
- ✅ Mantiene los tipos de movimiento ya creados (no los elimina ni duplica)

#### Tipos de movimiento que se agregarán/actualizarán:

**Tipos nuevos para cuenta corriente:**

1. **Venta** (operation_type: salida, is_current_account_movement: true)
   - Se usa para registrar ventas que aumentan la deuda del cliente
   - ⚠️ **CRÍTICO**: Este es el tipo que estaba faltando y causaba el error

2. **Pago en efectivo** (operation_type: entrada, is_current_account_movement: true)
   - Se usa para registrar pagos en efectivo que reducen la deuda

3. **Pago con tarjeta** (operation_type: entrada, is_current_account_movement: true)
   - Se usa para registrar pagos con tarjeta que reducen la deuda

4. **Pago con transferencia** (operation_type: entrada, is_current_account_movement: true)
   - Se usa para registrar pagos por transferencia que reducen la deuda

**Otros tipos que ya existen:**
- Venta en efectivo
- Venta a crédito
- Pago de cuenta corriente
- Gasto operativo
- Compra en efectivo
- Retiro de efectivo
- Ingreso inicial
- Pago de envío

## Pasos para ejecutar en producción:

### Paso 1: Agregar Método de Pago
```bash
cd /ruta/al/proyecto/apps/backend
php artisan db:seed:payment-methods --force
```

### Paso 2: Agregar Tipos de Movimiento
```bash
php artisan db:seed:movement-types --force
```

### O ejecutar ambos en secuencia:
```bash
php artisan db:seed:payment-methods --force && php artisan db:seed:movement-types --force
```

## Verificación

### Verificar método de pago:
```sql
SELECT * FROM payment_methods WHERE name = 'Cuenta Corriente';
```

### Verificar tipos de movimiento:
```sql
SELECT * FROM movement_types 
WHERE name IN ('Venta', 'Pago en efectivo', 'Pago con tarjeta', 'Pago con transferencia')
AND is_current_account_movement = 1;
```

### Verificar desde el frontend:
1. Verificar que el método de pago "Cuenta Corriente" aparezca en el dropdown al completar una venta
2. Crear una venta con cliente (cualquier método de pago) - debería funcionar sin errores

## Alternativa: Ejecutar todo el seeder de producción

Si prefieres ejecutar todos los seeders de producción (incluye métodos de pago y tipos de movimiento):

```bash
php artisan db:seed:production --force
```

**Nota:** Esto ejecutará todos los seeders de producción. Los comandos específicos son más seguros y precisos para estos casos particulares.

