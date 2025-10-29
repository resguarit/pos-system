# 🔧 Solución para el Problema de Storage

## Problema

Las imágenes se suben correctamente pero no se pueden cargar en el frontend:
```
[Error] Error loading logo: – "/storage/system/logos/3JfaETORaVNEbGNzk7M0d7aQdWCe2jV8Xn81UONL.jpg"
```

## Causa

1. Las imágenes están almacenadas en `storage/app/public/system/logos/`
2. La URL generada es `/storage/system/logos/...` o URL completa
3. El symlink de storage no está configurado o no es accesible
4. Los headers CORS no están configurados para servir archivos estáticos

## ✅ Solución Implementada

### 1. Cambio en el Controller

Se actualizó `SettingController.php` para devolver URLs completas que apuntan al dominio del backend:

```php
// Generate public URL pointing to backend domain
$backendUrl = config('app.url');
$url = rtrim($backendUrl, '/') . '/storage/' . $path;
```

Ahora las URLs serán: `https://api.heroedelwhisky.com.ar/storage/system/logos/...`

### 2. Crear Symlink en el Servidor

Ejecuta este comando en el servidor:

```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
php artisan storage:link
```

O usa el script automatizado:

```bash
./scripts/fix-storage-symlink.sh
```

### 3. Configurar Nginx para CORS (Opcional pero Recomendado)

Edita la configuración de nginx para el backend:

```nginx
server {
    listen 80;
    server_name api.heroedelwhisky.com.ar;
    
    root /home/api.heroedelwhisky.com.ar/public_html/public;
    index index.php;

    # Agregar headers CORS para archivos estáticos del storage
    location /storage/ {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
        
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

Reinicia nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Verificación

### 1. Verificar Symlink

```bash
ls -la /home/api.heroedelwhisky.com.ar/public_html/apps/backend/public/ | grep storage
```

Debería mostrar algo como:
```
lrwxrwxrwx ... storage -> /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public
```

### 2. Verificar Archivos

```bash
ls -la /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/
```

### 3. Probar URL

```bash
curl -I https://api.heroedelwhisky.com.ar/storage/system/logos/ARCHIVO.jpg
```

Debería retornar `200 OK` con el header `Access-Control-Allow-Origin: *`

## 🚀 Deploy

Los cambios ya están incluidos en el workflow de deployment (`deploy-backend.yml`) que ejecuta `php artisan storage:link` automáticamente.

## 📝 Notas Adicionales

- Las URLs ahora son completas: `https://api.heroedelwhisky.com.ar/storage/...`
- El symlink se crea automáticamente en cada deployment
- Los headers CORS permiten acceso desde el frontend
- Las imágenes están accesibles públicamente (por diseño del sistema)

## 🔍 Troubleshooting

### Error 404 al acceder a imágenes

1. Verificar que el symlink existe:
   ```bash
   ls -la public/storage
   ```

2. Verificar que los archivos existen:
   ```bash
   ls -la storage/app/public/system/logos/
   ```

3. Verificar permisos:
   ```bash
   chmod -R 775 storage
   chown -R www-data:www-data storage
   ```

### Error de CORS

1. Verificar headers en la respuesta:
   ```bash
   curl -I https://api.heroedelwhisky.com.ar/storage/system/logos/ARCHIVO.jpg
   ```

2. Verificar que la configuración de nginx incluye los headers CORS

### Archivos no se suben

1. Verificar permisos de escritura:
   ```bash
   chmod -R 775 storage
   chmod -R 775 bootstrap/cache
   ```

2. Verificar espacio en disco:
   ```bash
   df -h
   ```

---

**Creado**: 2025
**Última actualización**: 2025

