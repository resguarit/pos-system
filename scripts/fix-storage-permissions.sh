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

# Detectar usuario del servidor web (prioridad: PHP-FPM pool > nginx > apache > www-data)
echo "1️⃣ Detectando usuario del servidor web..."
WEB_USER="www-data"

# Primero intentar detectar desde procesos PHP-FPM pool (más específico para CyberPanel)
PHP_FPM_USER=$(ps aux | grep 'php-fpm: pool' | grep -v grep | head -1 | awk '{print $1}' | grep -v root)
if [ ! -z "$PHP_FPM_USER" ]; then
    WEB_USER="$PHP_FPM_USER"
    echo "   ✓ Detectado PHP-FPM pool: $WEB_USER"
elif id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
    echo "   ✓ Detectado: nginx"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
    echo "   ✓ Detectado: apache"
elif id www-data >/dev/null 2>&1; then
    WEB_USER="www-data"
    echo "   ✓ Detectado: www-data"
else
    # Intentar detectar desde procesos PHP/web generales
    DETECTED_USER=$(ps aux | grep -E '(php-fpm|nginx|apache)' | grep -v grep | grep -v pool | head -1 | awk '{print $1}' | sed 's/root/www-data/')
    if [ ! -z "$DETECTED_USER" ] && [ "$DETECTED_USER" != "root" ]; then
        WEB_USER="$DETECTED_USER"
        echo "   ⚠️  Detectado desde procesos: $WEB_USER"
    else
        echo "   ⚠️  Usando por defecto: $WEB_USER"
    fi
fi

# Ensure logs directory exists and is writable
echo ""
echo "2️⃣ Asegurando que storage/logs existe y es escribible..."
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

# Eliminar el archivo de log existente si tiene permisos incorrectos (se recreará)
if [ -f storage/logs/laravel.log ]; then
    echo "   🗑️  Eliminando archivo de log existente para recrearlo con permisos correctos..."
    rm -f storage/logs/laravel.log 2>/dev/null || sudo rm -f storage/logs/laravel.log 2>/dev/null || true
fi

# Fix permissions for storage - usar sudo si es necesario
echo ""
echo "3️⃣ Configurando permisos de storage..."
chmod -R 775 storage 2>/dev/null || sudo chmod -R 775 storage || {
    echo "   ❌ Error al configurar permisos de storage"
    exit 1
}

chmod -R 775 bootstrap/cache 2>/dev/null || sudo chmod -R 775 bootstrap/cache || {
    echo "   ❌ Error al configurar permisos de bootstrap/cache"
    exit 1
}

# Para CyberPanel, usar permisos más permisivos en storage/logs (777 para directorio, 666 para archivo)
# Esto asegura que funcione incluso con configuraciones especiales de PHP-FPM
chmod -R 777 storage/logs 2>/dev/null || sudo chmod -R 777 storage/logs || {
    echo "   ❌ Error al configurar permisos de storage/logs"
    exit 1
}

# Crear el archivo de log si no existe
touch storage/logs/laravel.log 2>/dev/null || sudo touch storage/logs/laravel.log || {
    echo "   ❌ Error al crear archivo de log"
    exit 1
}

# Usar 666 para el archivo de log (más permisivo, necesario para CyberPanel)
chmod 666 storage/logs/laravel.log 2>/dev/null || sudo chmod 666 storage/logs/laravel.log || true

# Fix ownership - usar sudo si es necesario
echo ""
echo "4️⃣ Configurando ownership (usuario: $WEB_USER)..."
chown -R $WEB_USER:$WEB_USER storage 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage || {
    echo "   ❌ Error al configurar ownership de storage"
    exit 1
}

chown -R $WEB_USER:$WEB_USER bootstrap/cache 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache || {
    echo "   ❌ Error al configurar ownership de bootstrap/cache"
    exit 1
}

chown -R $WEB_USER:$WEB_USER storage/logs 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage/logs || {
    echo "   ❌ Error al configurar ownership de storage/logs"
    exit 1
}

# Asegurar que el archivo de log tiene el ownership correcto
chown $WEB_USER:$WEB_USER storage/logs/laravel.log 2>/dev/null || sudo chown $WEB_USER:$WEB_USER storage/logs/laravel.log || true

# Fix symlink permissions
if [ -L "public/storage" ]; then
    echo ""
    echo "5️⃣ Configurando permisos del symlink..."
    chmod 775 public/storage 2>/dev/null || sudo chmod 775 public/storage || true
    chown $WEB_USER:$WEB_USER public/storage 2>/dev/null || sudo chown $WEB_USER:$WEB_USER public/storage || true
fi

# List files to verify
echo ""
echo "6️⃣ Verificando directorios..."
ls -la storage/app/public/system/logos/ 2>/dev/null || echo "   ℹ️  No hay logos aún"

echo ""
echo "✅ Permisos configurados correctamente!"

# Verify with a test
echo ""
echo "📋 Verificando permisos finales..."
ls -ld storage | awk '{print "   storage: " $1 " " $3 " " $4}'
ls -ld storage/logs | awk '{print "   storage/logs: " $1 " " $3 " " $4}'
if [ -f storage/logs/laravel.log ]; then
    ls -l storage/logs/laravel.log | awk '{print "   laravel.log: " $1 " " $3 " " $4}'
    echo "   ✓ Archivo de log existe y tiene permisos correctos"
else
    echo "   ⚠️  Archivo de log aún no existe (se creará automáticamente)"
fi
ls -ld storage/app | awk '{print "   storage/app: " $1 " " $3 " " $4}'
ls -ld storage/app/public 2>/dev/null | awk '{print "   storage/app/public: " $1 " " $3 " " $4}' || echo "   ℹ️  storage/app/public no existe aún"

# Test de escritura
echo ""
echo "🧪 Test de escritura en log..."
if sudo -u $WEB_USER touch storage/logs/test.log 2>/dev/null || touch storage/logs/test.log 2>/dev/null; then
    echo "   ✅ Escritura exitosa"
    rm -f storage/logs/test.log 2>/dev/null || sudo rm -f storage/logs/test.log 2>/dev/null || true
else
    echo "   ❌ Error: No se puede escribir en storage/logs"
    echo "   💡 Intenta ejecutar manualmente: sudo chown -R $WEB_USER:$WEB_USER $BACKEND_PATH/storage"
    exit 1
fi

ENDSSH

echo ""
echo "✅ Script completado!"
echo ""
echo "💡 Si el error persiste, ejecuta manualmente en el servidor:"
echo "   cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend"
echo "   sudo chown -R \$(ps aux | grep -E '(nginx|apache|php-fpm)' | grep -v grep | head -1 | awk '{print \$1}'):\$(ps aux | grep -E '(nginx|apache|php-fpm)' | grep -v grep | head -1 | awk '{print \$1}') storage"
echo "   sudo chmod -R 775 storage"
echo "   sudo chmod -R 775 bootstrap/cache"
