#!/bin/bash
# Script para crear el symlink de storage en producción
# Conectar a tu VPS y ejecutar estos comandos:

echo "Verificando y creando symlink para storage..."
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Crear el directorio public si no existe
mkdir -p public

# Crear symlink si no existe
if [ ! -L public/storage ]; then
    php artisan storage:link
    echo "✅ Symlink creado exitosamente"
else
    echo "✅ Symlink ya existe"
fi

echo "Verificando permisos..."
chmod -R 775 storage
chown -R www-data:www-data storage
chmod -R 775 public/storage
chown -R www-data:www-data public/storage

echo "✅ Permisos configurados"
