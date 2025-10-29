# Fix Storage y Logo en Producción

## Problema
El logo no se muestra porque:
1. El symlink de storage puede no existir
2. Nginx no está configurado para servir archivos desde storage
3. Los permisos pueden estar incorrectos

## Solución

### 1. Actualizar configuración de Nginx

**Editar:** `/etc/nginx/sites-available/api.heroedelwhisky.com.ar`

**Agregar esta configuración antes de la sección `location /`:**

```nginx
server {
    listen 80;
    server_name api.heroedelwhisky.com.ar;
    
    # ROOT CORRECTO
    root /home/api.heroedelwhisky.com.ar/public_html/apps/backend/public;
    index index.php;

    # SERVIR ARCHIVOS DE STORAGE (AGREGAR ESTO)
    location /storage {
        alias /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public;
        try_files $uri $uri/ =404;
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

### 2. Crear el symlink y configurar permisos

**Conectarse al servidor:**
```bash
ssh -p 5507 posdeployer@149.50.138.145
```

**Ejecutar:**
```bash
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Crear symlink
php artisan storage:link

# Verificar que exista
ls -la public/storage

# Configurar permisos
sudo chown -R www-data:www-data storage/app/public
sudo chmod -R 775 storage/app/public

# Reiniciar Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Verificar que el archivo existe

```bash
# Buscar el archivo del logo
find storage/app/public -name "*.jpg" | grep -i logo
ls -la storage/app/public/system/logos/

# Si el archivo no existe, volver a subir el logo desde la interfaz
```

### 4. Probar la URL

Abrir en navegador:
```
https://api.heroedelwhisky.com.ar/storage/system/logos/vw2vpxw5WMWl03In8mBNQzNxKpUID9daL8YAZtNu.jpg
```

Si da 404, verificar:
```bash
# Ver si el archivo existe físicamente
ls -la /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/

# Ver permisos
stat storage/app/public/system/logos/vw2vpxw5WMWl03In8mBNQzNxKpUID9daL8YAZtNu.jpg
```

## Solución Alternativa (Solo para probar)

Si Nginx es complicado, podemos mover el logo a una ubicación pública:

```bash
# En el servidor
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
cp storage/app/public/system/logos/vw2vpxw5WMWl03In8mBNQzNxKpUID9daL8YAZtNu.jpg public/images/
```

Luego actualizar manualmente la URL en la base de datos:
```sql
UPDATE settings SET value = '"https://api.heroedelwhisky.com.ar/images/vw2vpxw5WMWl03In8mBNQzNxKpUID9daL8YAZtNu.jpg"' WHERE key = 'logo_url';
```

