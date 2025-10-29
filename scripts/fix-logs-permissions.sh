#!/bin/bash

# Script para corregir permisos de logs en producción
# Soluciona el error: "Permission denied" en storage/logs/laravel.log
# Detecta automáticamente la ruta correcta (app/backend o apps/backend)

echo "🔧 Corrigiendo permisos de logs..."

# Configuración del servidor
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BASE_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html}"

echo "📍 Conectando a ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo "📂 Base path: ${BASE_PATH}"

ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << ENDSSH

BASE_PATH="${BASE_PATH}"

echo ""
echo "🚀 Configurando permisos de logs en servidor..."
echo ""

# Detectar la ruta correcta del backend
if [ -d "\$BASE_PATH/apps/backend" ]; then
    BACKEND_PATH="\$BASE_PATH/apps/backend"
    echo "✅ Detectado: apps/backend"
elif [ -d "\$BASE_PATH/app/backend" ]; then
    BACKEND_PATH="\$BASE_PATH/app/backend"
    echo "✅ Detectado: app/backend"
elif [ -d "\$BASE_PATH" ]; then
    # Si está directamente en la raíz
    BACKEND_PATH="\$BASE_PATH"
    echo "✅ Usando ruta base directamente"
else
    echo "❌ Error: No se encontró el directorio del backend"
    echo "Buscando en: \$BASE_PATH/apps/backend"
    echo "Buscando en: \$BASE_PATH/app/backend"
    echo "Buscando en: \$BASE_PATH"
    exit 1
fi

echo "📂 Ruta del backend: \$BACKEND_PATH"
cd "\$BACKEND_PATH" || exit 1

# Verificar que estamos en un proyecto Laravel
if [ ! -f "artisan" ]; then
    echo "❌ Error: No se encontró artisan.php. ¿Es un proyecto Laravel?"
    exit 1
fi

# Ensure logs directory exists
echo ""
echo "1️⃣ Creando directorio storage/logs si no existe..."
mkdir -p storage/logs || {
    echo "❌ Error al crear directorio storage/logs"
    exit 1
}

# Create log file if it doesn't exist with proper permissions
echo "2️⃣ Creando archivo laravel.log si no existe..."
if [ ! -f "storage/logs/laravel.log" ]; then
    touch storage/logs/laravel.log || {
        echo "⚠️ No se pudo crear laravel.log, pero continuamos..."
    }
fi

# Detectar el usuario del servidor web
WEB_USER="www-data"
if id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
fi
echo "🌐 Usuario del servidor web detectado: \$WEB_USER"

# Set proper permissions
echo ""
echo "3️⃣ Configurando permisos del directorio logs..."
chmod -R 775 storage/logs 2>/dev/null || {
    echo "⚠️ No se pudieron cambiar permisos (puede requerir sudo)"
}

if [ -f "storage/logs/laravel.log" ]; then
    chmod 664 storage/logs/laravel.log 2>/dev/null || true
fi

# Set proper ownership (usando sudo si es necesario)
echo "4️⃣ Configurando ownership..."
# Intentar sin sudo primero
if chown -R \$WEB_USER:\$WEB_USER storage/logs 2>/dev/null; then
    echo "✅ Ownership configurado sin sudo"
else
    # Si falla, intentar con sudo
    if sudo chown -R \$WEB_USER:\$WEB_USER storage/logs 2>/dev/null; then
        echo "✅ Ownership configurado con sudo"
    else
        echo "⚠️ No se pudo cambiar ownership. Puede requerir ejecutar manualmente con sudo"
        echo "   Ejecuta: sudo chown -R \$WEB_USER:\$WEB_USER storage/logs"
    fi
fi

# También asegurar permisos de todo el directorio storage
echo ""
echo "5️⃣ Configurando permisos de todo storage..."
chmod -R 775 storage 2>/dev/null || true
chmod -R 775 bootstrap/cache 2>/dev/null || true

# Intentar cambiar ownership de storage completo si es posible
if [ -w "storage" ]; then
    chown -R \$WEB_USER:\$WEB_USER storage 2>/dev/null || \
    sudo chown -R \$WEB_USER:\$WEB_USER storage 2>/dev/null || true
fi

# Verify permissions
echo ""
echo "6️⃣ Verificando permisos..."
echo "📁 Permisos de storage/logs:"
ls -ld storage/logs 2>/dev/null || echo "⚠️ No se pudo listar storage/logs"

if [ -f "storage/logs/laravel.log" ]; then
    echo "📄 Permisos de laravel.log:"
    ls -l storage/logs/laravel.log 2>/dev/null || echo "⚠️ No se pudo listar laravel.log"
else
    echo "📄 Archivo laravel.log no existe aún (se creará automáticamente cuando Laravel lo necesite)"
fi

# Test write permission
echo ""
echo "7️⃣ Probando escritura..."
TEST_FILE="storage/logs/test_write_\$\$.txt"
if touch "\$TEST_FILE" 2>/dev/null; then
    rm -f "\$TEST_FILE"
    echo "✅ Escritura exitosa - Los permisos están correctos"
else
    echo "⚠️ No se pudo escribir en storage/logs"
    echo "   Esto puede requerir sudo para cambiar ownership"
    echo ""
    echo "   Ejecuta estos comandos manualmente:"
    echo "   cd \$BACKEND_PATH"
    echo "   sudo chown -R \$WEB_USER:\$WEB_USER storage/logs"
    echo "   sudo chmod -R 775 storage/logs"
fi

echo ""
echo "✅ Script completado!"

ENDSSH

echo ""
echo "✅ Script completado!"
echo ""
echo "💡 Si el problema persiste, ejecuta estos comandos en el servidor:"
echo "   cd ${BASE_PATH}/apps/backend || cd ${BASE_PATH}/app/backend"
echo "   sudo chown -R www-data:www-data storage/logs"
echo "   sudo chmod -R 775 storage/logs"

