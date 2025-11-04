#!/bin/bash

# Script para corregir permisos de storage en producción - Héroe del Whisky
# Este script puede ejecutarse remotamente via SSH o directamente en el servidor

set -e  # Salir si hay errores

BACKEND_PATH="/home/api.heroedelwhisky.com.ar/public_html/apps/backend"

echo ""
echo "🔧 Corrigiendo permisos de storage - Héroe del Whisky"
echo "📂 Backend path: ${BACKEND_PATH}"
echo ""

cd "$BACKEND_PATH" || {
    echo "❌ Error: No se puede acceder al directorio $BACKEND_PATH"
    exit 1
}

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

# Asegurar que todos los directorios existen
echo ""
echo "2️⃣ Asegurando que todos los directorios existen..."
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

# Eliminar el archivo de log existente si tiene permisos incorrectos (se recreará)
if [ -f storage/logs/laravel.log ]; then
    echo "   🗑️  Eliminando archivo de log existente para recrearlo con permisos correctos..."
    sudo rm -f storage/logs/laravel.log 2>/dev/null || rm -f storage/logs/laravel.log 2>/dev/null || true
fi

# Fix permissions for storage - usar sudo si es necesario
echo ""
echo "3️⃣ Configurando permisos de storage..."
sudo chmod -R 775 storage || {
    echo "   ⚠️  Error al configurar permisos de storage con sudo, intentando sin sudo..."
    chmod -R 775 storage || {
        echo "   ❌ Error al configurar permisos de storage"
        exit 1
    }
}

sudo chmod -R 775 bootstrap/cache || {
    echo "   ⚠️  Error al configurar permisos de bootstrap/cache con sudo, intentando sin sudo..."
    chmod -R 775 bootstrap/cache || {
        echo "   ❌ Error al configurar permisos de bootstrap/cache"
        exit 1
    }
}

# Para CyberPanel, usar permisos más permisivos en storage/logs (777 para directorio, 666 para archivo)
echo ""
echo "4️⃣ Configurando permisos CRÍTICOS para storage/logs..."
sudo chmod -R 777 storage/logs || {
    echo "   ⚠️  Error al configurar permisos de storage/logs con sudo, intentando sin sudo..."
    chmod -R 777 storage/logs || {
        echo "   ❌ Error al configurar permisos de storage/logs"
        exit 1
    }
}

# Crear el archivo de log si no existe
echo ""
echo "5️⃣ Creando archivo de log..."
sudo touch storage/logs/laravel.log || touch storage/logs/laravel.log || {
    echo "   ❌ Error al crear archivo de log"
    exit 1
}

# Usar 666 para el archivo de log (más permisivo, necesario para CyberPanel)
sudo chmod 666 storage/logs/laravel.log || chmod 666 storage/logs/laravel.log || true

# Fix ownership - usar sudo si es necesario
echo ""
echo "6️⃣ Configurando ownership (usuario: $WEB_USER)..."
sudo chown -R $WEB_USER:$WEB_USER storage || {
    echo "   ❌ Error al configurar ownership de storage"
    echo "   💡 Intenta ejecutar manualmente: sudo chown -R $WEB_USER:$WEB_USER storage"
    exit 1
}

sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache || {
    echo "   ❌ Error al configurar ownership de bootstrap/cache"
    exit 1
}

sudo chown -R $WEB_USER:$WEB_USER storage/logs || {
    echo "   ❌ Error al configurar ownership de storage/logs"
    exit 1
}

# Asegurar que el archivo de log tiene el ownership correcto
sudo chown $WEB_USER:$WEB_USER storage/logs/laravel.log || chown $WEB_USER:$WEB_USER storage/logs/laravel.log || true

# Fix symlink permissions
if [ -L "public/storage" ]; then
    echo ""
    echo "7️⃣ Configurando permisos del symlink..."
    sudo chmod 775 public/storage || chmod 775 public/storage || true
    sudo chown $WEB_USER:$WEB_USER public/storage || chown $WEB_USER:$WEB_USER public/storage || true
fi

# Verificar permisos finales
echo ""
echo "8️⃣ Verificando permisos finales..."
ls -ld storage | awk '{print "   storage: " $1 " " $3 " " $4}'
ls -ld storage/logs | awk '{print "   storage/logs: " $1 " " $3 " " $4}'
if [ -f storage/logs/laravel.log ]; then
    ls -l storage/logs/laravel.log | awk '{print "   laravel.log: " $1 " " $3 " " $4}'
    echo "   ✓ Archivo de log existe y tiene permisos correctos"
else
    echo "   ⚠️  Archivo de log aún no existe (se creará automáticamente)"
fi

# Test de escritura
echo ""
echo "9️⃣ Test de escritura en log..."
TEST_FILE="storage/logs/test_write_$(date +%s).log"
if sudo -u $WEB_USER touch "$TEST_FILE" 2>/dev/null || touch "$TEST_FILE" 2>/dev/null; then
    echo "   ✅ Escritura exitosa"
    sudo rm -f "$TEST_FILE" 2>/dev/null || rm -f "$TEST_FILE" 2>/dev/null || true
else
    echo "   ❌ Error: No se puede escribir en storage/logs"
    echo "   💡 Intenta ejecutar manualmente:"
    echo "      sudo chown -R $WEB_USER:$WEB_USER $BACKEND_PATH/storage"
    echo "      sudo chmod -R 775 $BACKEND_PATH/storage"
    echo "      sudo chmod -R 777 $BACKEND_PATH/storage/logs"
    exit 1
fi

echo ""
echo "✅ Permisos configurados correctamente!"
echo ""
echo "📋 Resumen:"
echo "   - Usuario web: $WEB_USER"
echo "   - Storage: permisos 775, ownership $WEB_USER:$WEB_USER"
echo "   - Storage/logs: permisos 777, ownership $WEB_USER:$WEB_USER"
echo "   - Laravel.log: permisos 666, ownership $WEB_USER:$WEB_USER"
echo ""

