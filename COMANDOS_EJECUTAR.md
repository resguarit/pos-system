# 🚀 Comandos para Ejecutar en el Servidor

## ✅ Ya está todo arreglado

Hice idempotentes todas las migraciones (verifican antes de ejecutar).

---

## 📋 En el Servidor de Producción:

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# 1. Pull de cambios
git pull origin master

# 2. Ejecutar migración (ya NO debería fallar)
php artisan migrate

# 3. Hacer credit_limit nullable manualmente (si es necesario)
php artisan tinker
```
```php
DB::statement("ALTER TABLE current_accounts MODIFY COLUMN credit_limit DECIMAL(12, 2) NULL");
exit
```

```bash
# 4. Recrear cuentas corrientes con límite infinito
php artisan current-accounts:recreate-infinite --force

# 5. Limpiar caché
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 6. Verificar
php artisan current-accounts:check-limits
```

---

## ✅ Resultado Esperado

- ✅ Migración ejecutada sin errores
- ✅ 54 cuentas corrientes con límite infinito
- ✅ No más errores 500
- ✅ Frontend muestra "∞" en límites

