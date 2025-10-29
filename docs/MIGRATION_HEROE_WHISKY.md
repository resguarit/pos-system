# 🔄 Migración de CORS para Heroe del Whisky (Producción)

Esta guía explica los pasos necesarios para actualizar el sistema en producción después de subir los cambios de CORS.

## ⚠️ Pasos Requeridos en el VPS

### 1. Actualizar el código (si usas Git)

```bash
ssh usuario@vps-ip
cd /home/api.heroedelwhisky.com.ar/public_html

# Hacer pull de los cambios
git pull origin master
```

### 2. Agregar variable FRONTEND_URL al .env

**IMPORTANTE:** Debes agregar esta variable al archivo `.env` del backend antes de hacer `config:cache`.

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Editar el archivo .env
nano .env  # o usa el editor que prefieras
```

**Agregar esta línea al `.env`:**

```env
FRONTEND_URL=https://heroedelwhisky.com.ar
```

**Ejemplo completo del .env (solo muestra las líneas relevantes):**

```env
APP_NAME="POS System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.heroedelwhisky.com.ar

# ⚠️ NUEVA VARIABLE - Agregar esta línea
FRONTEND_URL=https://heroedelwhisky.com.ar

DB_CONNECTION=mysql
DB_HOST=localhost
# ... resto de la configuración
```

**📝 Nota:** 
- Debe incluir `https://` (o `http://` si no tienes SSL)
- **NO** debe tener trailing slash al final
- Debe ser el dominio del frontend (no del API)

### 3. Limpiar y regenerar cache de configuración

**CRÍTICO:** Laravel cachea la configuración. Debes limpiar y regenerar el cache para que lea el nuevo valor.

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Limpiar todos los caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Regenerar caches de producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 4. Verificar que funcione

```bash
# Verificar que CORS esté configurado correctamente
# Puedes verificar revisando el log o probando desde el frontend
tail -f storage/logs/laravel.log
```

O puedes probar directamente desde el navegador:
- Abre `https://heroedelwhisky.com.ar`
- Abre la consola del navegador (F12)
- Intenta hacer una llamada a la API
- No deberías ver errores de CORS

## 🔍 Verificación Rápida

Ejecuta estos comandos para verificar:

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Verificar que la variable esté en el .env
grep FRONTEND_URL .env

# Debería mostrar:
# FRONTEND_URL=https://heroedelwhisky.com.ar

# Verificar que el cache esté actualizado
php artisan tinker
>>> config('cors.allowed_origins')
# Debería mostrar un array que incluya 'https://heroedelwhisky.com.ar'
>>> exit
```

## ⚡ Script Completo (Todo en uno)

Puedes ejecutar todo esto de una vez:

```bash
cd /home/api.heroedelwhisky.com.ar/public_html

# 1. Actualizar código
git pull origin master

# 2. Ir al backend
cd apps/backend

# 3. Agregar variable si no existe (crea backup primero)
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
if ! grep -q "FRONTEND_URL" .env; then
    echo "" >> .env
    echo "FRONTEND_URL=https://heroedelwhisky.com.ar" >> .env
    echo "✅ Variable FRONTEND_URL agregada al .env"
else
    echo "⚠️ Variable FRONTEND_URL ya existe, verifica que sea correcta:"
    grep FRONTEND_URL .env
fi

# 4. Limpiar y regenerar cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Migración completada!"
```

## 🐛 Troubleshooting

### Error: "Allowed origins empty"
- Verifica que `FRONTEND_URL` esté correctamente escrito en el `.env`
- Asegúrate de haber ejecutado `php artisan config:clear` y luego `php artisan config:cache`

### Error: "CORS policy blocked"
- Verifica que el dominio en `FRONTEND_URL` coincida exactamente con el dominio del frontend
- Asegúrate de incluir el protocolo (`https://`)
- No debe tener trailing slash

### El cambio no se aplica
- Limpia todos los caches: `php artisan optimize:clear`
- Luego regenera: `php artisan optimize`

## 📋 Checklist

- [ ] Código actualizado (`git pull`)
- [ ] Variable `FRONTEND_URL` agregada al `.env`
- [ ] Cache limpiado (`config:clear`, `cache:clear`, etc.)
- [ ] Cache regenerado (`config:cache`, `route:cache`, `view:cache`)
- [ ] Verificado que no hay errores de CORS en el navegador
- [ ] Verificado en los logs que todo funciona

## 🔐 Nota de Seguridad

Después de modificar el `.env`, asegúrate de que el archivo tenga los permisos correctos:

```bash
chmod 600 .env  # Solo el propietario puede leer/escribir
chown www-data:www-data .env  # O el usuario apropiado
```

