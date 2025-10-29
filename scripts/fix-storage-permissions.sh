#!/bin/bash

# Script para corregir permisos de storage en producción

echo "🔧 Corrigiendo permisos de storage..."

# Configuración del servidor
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BACKEND_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html/apps/backend}"

echo "📍 Conectando a ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo "📂 Backend path: ${BACKEND_PATH}"

ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << 'ENDSSH'

BACKEND_PATH="/home/api.heroedelwhisky.com.ar/public_html/apps/backend"

echo ""
echo "🚀 Configurando permisos en servidor..."
echo ""

cd "$BACKEND_PATH"

# Fix permissions for storage
echo "1️⃣ Configurando permisos de storage..."
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Fix ownership
echo "2️⃣ Configurando ownership..."
chown -R www-data:www-data storage
chown -R www-data:www-data bootstrap/cache

# Fix symlink permissions
if [ -L "public/storage" ]; then
    echo "3️⃣ Configurando permisos del symlink..."
    chmod 775 public/storage
    chown www-data:www-data public/storage
fi

# List files to verify
echo ""
echo "4️⃣ Verificando directorios..."
ls -la storage/app/public/system/logos/ 2>/dev/null || echo "No hay logos aún"

echo ""
echo "✅ Permisos configurados correctamente!"

# Verify with a test
echo ""
echo "📋 Verificando permisos..."
ls -ld storage
ls -ld storage/app
ls -ld storage/app/public

ENDSSH

echo ""
echo "✅ Script completado!"
echo ""
echo "💡 Próximos pasos:"
echo "   1. Sube una nueva imagen desde el panel de configuración"
echo "   2. Verifica que se puede acceder a la URL de la imagen"
