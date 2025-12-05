#!/bin/bash

# Script para arreglar permisos de storage en producción
# Ejecutar desde el directorio apps/backend

echo "🔧 Arreglando permisos de storage..."

# Crear directorios necesarios
mkdir -p storage/app/public/system/logos
mkdir -p storage/app/public/system/favicons

# Dar permisos correctos
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Cambiar owner a www-data (usuario de nginx/apache)
# Ajusta esto según tu configuración
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache

# Verificar que el symlink existe
if [ ! -L "public/storage" ]; then
    echo "📁 Creando symlink de storage..."
    php artisan storage:link
fi

echo "✅ Permisos arreglados!"
echo ""
echo "Verificando estructura:"
ls -la storage/app/public/system/
