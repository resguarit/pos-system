#!/bin/bash

# Script para corregir permisos de logs en producción
# Soluciona el error: "Permission denied" en storage/logs/laravel.log

echo "🔧 Corrigiendo permisos de logs..."

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
echo "🚀 Configurando permisos de logs en servidor..."
echo ""

cd "$BACKEND_PATH"

# Ensure logs directory exists
echo "1️⃣ Creando directorio storage/logs si no existe..."
mkdir -p storage/logs

# Create log file if it doesn't exist
echo "2️⃣ Creando archivo laravel.log si no existe..."
touch storage/logs/laravel.log 2>/dev/null || true

# Set proper permissions
echo "3️⃣ Configurando permisos del directorio logs..."
chmod -R 775 storage/logs
chmod 664 storage/logs/laravel.log 2>/dev/null || true

# Set proper ownership (www-data is the web server user)
echo "4️⃣ Configurando ownership..."
chown -R www-data:www-data storage/logs

# Verify permissions
echo ""
echo "5️⃣ Verificando permisos..."
ls -ld storage/logs
ls -l storage/logs/laravel.log 2>/dev/null || echo "⚠️ Archivo laravel.log no existe aún (se creará automáticamente)"

# Test write permission
echo ""
echo "6️⃣ Probando escritura..."
if touch storage/logs/test_write.txt 2>/dev/null; then
    rm -f storage/logs/test_write.txt
    echo "✅ Escritura exitosa - Los permisos están correctos"
else
    echo "❌ Error al escribir - Verifica los permisos manualmente"
    echo ""
    echo "Ejecuta estos comandos manualmente si es necesario:"
    echo "  sudo chown -R www-data:www-data storage/logs"
    echo "  sudo chmod -R 775 storage/logs"
fi

echo ""
echo "✅ Script completado!"

ENDSSH

echo ""
echo "✅ Script completado!"
echo ""
echo "💡 Si el problema persiste, ejecuta estos comandos en el servidor:"
echo "   sudo chown -R www-data:www-data $BACKEND_PATH/storage/logs"
echo "   sudo chmod -R 775 $BACKEND_PATH/storage/logs"
echo "   sudo chmod 664 $BACKEND_PATH/storage/logs/laravel.log"

