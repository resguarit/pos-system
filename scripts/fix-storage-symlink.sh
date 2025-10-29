#!/bin/bash

# Script para crear el symlink de storage en producción

echo "🔧 Configurando symlink de storage..."

# Configuración del servidor
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BACKEND_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html/apps/backend}"

echo "📍 Conectando a ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo "📂 Backend path: ${BACKEND_PATH}"

ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << 'ENDSSH'

# Variables del servidor
BACKEND_PATH="/home/api.heroedelwhisky.com.ar/public_html/apps/backend"

echo ""
echo "🚀 Configurando storage en servidor..."
echo ""

cd "$BACKEND_PATH"

# Verificar que el directorio public existe
if [ ! -d "public" ]; then
    echo "❌ Error: directorio public no existe"
    exit 1
fi

# Verificar que el directorio storage/app/public existe
if [ ! -d "storage/app/public" ]; then
    echo "📁 Creando directorio storage/app/public..."
    mkdir -p storage/app/public
    chmod -R 775 storage
fi

# Eliminar symlink existente si existe
if [ -L "public/storage" ]; then
    echo "🗑️  Eliminando symlink existente..."
    rm public/storage
fi

# Crear el symlink
echo "🔗 Creando symlink storage..."
php artisan storage:link

# Verificar que el symlink se creó correctamente
if [ -L "public/storage" ]; then
    echo "✅ Symlink creado correctamente"
    ls -la public/ | grep storage
else
    echo "❌ Error: symlink no se creó"
    exit 1
fi

# Verificar que los archivos son accesibles
echo ""
echo "📂 Verificando directorios..."
ls -la storage/app/public/

# Configurar permisos
echo ""
echo "🔐 Configurando permisos..."
chmod -R 775 storage
chmod -R 775 bootstrap/cache
chown -R www-data:www-data storage
chown -R www-data:www-data bootstrap/cache

# Verificar que public/storage tiene los permisos correctos
if [ -L "public/storage" ] || [ -d "public/storage" ]; then
    chmod -R 775 public/storage
    chown -R www-data:www-data public/storage
fi

# Verificar que hay archivos de logo
if [ -d "storage/app/public/system/logos" ]; then
    echo ""
    echo "📸 Logos en storage:"
    ls -lh storage/app/public/system/logos/
fi

echo ""
echo "✅ Configuración completada!"
echo ""
echo "🌐 Verifica la URL: https://api.heroedelwhisky.com.ar/storage/system/logos/"

ENDSSH

echo ""
echo "✅ Script completado!"

