#!/bin/bash

# Script para corregir permisos de storage en producción - Hela Ditos
# Especialmente storage/framework/views para generar PDFs

echo "🔧 Corrigiendo permisos de storage (Hela Ditos)..."

# Configuración del servidor
VPS_HOST="${VPS_HOST:-200.58.127.86}"
VPS_PORT="${VPS_PORT:-5614}"
VPS_USERNAME="${VPS_USERNAME:-root}"
BACKEND_PATH="/home/api.hela-ditos.com.ar/public_html/apps/backend"

echo "📍 Conectando a ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo "📂 Backend path: ${BACKEND_PATH}"

ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << ENDSSH

cd "$BACKEND_PATH"

echo ""
echo "🚀 Configurando permisos en servidor (Hela Ditos)..."
echo ""

# Detectar usuario del servidor web
WEB_USER="apihe9688"
if id "$WEB_USER" >/dev/null 2>&1; then
    echo "   Usuario detectado: $WEB_USER"
else
    PHP_FPM_USER=\$(ps aux | grep 'php-fpm: pool' | grep -v grep | head -1 | awk '{print \$1}' | grep -v root)
    if [ ! -z "\$PHP_FPM_USER" ]; then
        WEB_USER="\$PHP_FPM_USER"
        echo "   Usuario PHP-FPM detectado: \$WEB_USER"
    else
        WEB_USER="www-data"
        echo "   Usando usuario por defecto: \$WEB_USER"
    fi
fi

# Asegurar que todos los directorios existen
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

echo ""
echo "1️⃣ Configurando permisos generales..."
chmod -R 775 storage 2>/dev/null || sudo chmod -R 775 storage || true
chmod -R 775 bootstrap/cache 2>/dev/null || sudo chmod -R 775 bootstrap/cache || true
chmod -R 777 storage/logs 2>/dev/null || sudo chmod -R 777 storage/logs || true

echo ""
echo "2️⃣ Configurando permisos CRÍTICOS para storage/framework/views (PDFs)..."
chmod -R 777 storage/framework/views 2>/dev/null || sudo chmod -R 777 storage/framework/views || {
    echo "   ❌ Error al configurar permisos de storage/framework/views"
    exit 1
}

echo ""
echo "3️⃣ Configurando ownership..."
chown -R \$WEB_USER:\$WEB_USER storage 2>/dev/null || sudo chown -R \$WEB_USER:\$WEB_USER storage || {
    echo "   ❌ Error al configurar ownership de storage"
    exit 1
}

chown -R \$WEB_USER:\$WEB_USER storage/framework/views 2>/dev/null || sudo chown -R \$WEB_USER:\$WEB_USER storage/framework/views || {
    echo "   ❌ Error al configurar ownership de storage/framework/views"
    exit 1
}

chown -R \$WEB_USER:\$WEB_USER bootstrap/cache 2>/dev/null || sudo chown -R \$WEB_USER:\$WEB_USER bootstrap/cache || true

echo ""
echo "4️⃣ Verificando permisos..."
ls -ld storage/framework/views | awk '{print "   storage/framework/views: " \$1 " " \$3 " " \$4}'

echo ""
echo "5️⃣ Test de escritura en storage/framework/views..."
TEST_FILE="storage/framework/views/test_write_\$(date +%s).php"
if sudo -u \$WEB_USER touch "\$TEST_FILE" 2>/dev/null || touch "\$TEST_FILE" 2>/dev/null; then
    echo "   ✅ Escritura exitosa"
    rm -f "\$TEST_FILE" 2>/dev/null || sudo rm -f "\$TEST_FILE" 2>/dev/null || true
else
    echo "   ❌ Error: No se puede escribir en storage/framework/views"
    echo "   💡 Ejecuta manualmente: sudo chmod -R 777 $BACKEND_PATH/storage/framework/views"
    exit 1
fi

echo ""
echo "✅ Permisos configurados correctamente!"

ENDSSH

echo ""
echo "✅ Script completado!"

