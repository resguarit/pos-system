#!/bin/bash

# Script de deployment para el backend Laravel - Hela Ditos
# Este script se ejecuta en el servidor VPS

echo "🚀 Iniciando deployment del backend (Hela Ditos)..."

# Cambiar al directorio del proyecto
cd /home/api.hela-ditos.com.ar/public_html

# Limpiar locks de Git si existen
if [ -f .git/HEAD.lock ]; then
    echo "🧹 Eliminando lock file de Git..."
    rm -f .git/HEAD.lock .git/refs/heads/master.lock 2>/dev/null || true
fi

# Configurar SSH para evitar pedir passphrase
# Prioridad: id_ed25519_deploy (sin passphrase) > id_ed25519 (puede tener passphrase)
if [ -n "${SSH_AUTH_SOCK:-}" ]; then
    echo "🔑 Usando ssh-agent existente..."
elif [ -f ~/.ssh/id_ed25519_deploy ]; then
    echo "🔑 Usando clave SSH sin passphrase (id_ed25519_deploy)..."
    if eval "$(ssh-agent -s)" >/dev/null 2>&1; then
        ssh-add ~/.ssh/id_ed25519_deploy </dev/null 2>/dev/null || true
    fi
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "🔑 Configurando SSH (si la clave tiene passphrase, Git la usará directamente)..."
    if eval "$(ssh-agent -s)" >/dev/null 2>&1; then
        ssh-add ~/.ssh/id_ed25519 </dev/null 2>/dev/null || echo "   ⚠️  Clave SSH no agregada (probablemente tiene passphrase)"
    fi
fi

# Configurar Git para usar SSH siempre
git config --global url."git@github.com:".insteadOf "https://github.com/" 2>/dev/null || true

# Hacer pull de los últimos cambios
echo "📥 Obteniendo últimos cambios del repositorio..."
git pull origin master

# Cambiar al directorio del backend Laravel
cd apps/backend

# Usar la misma versión de PHP que el servidor web (LiteSpeed usa PHP 8.2)
PHP_BIN="/usr/local/lsws/lsphp82/bin/php"
if [ ! -f "$PHP_BIN" ]; then
    PHP_BIN="php"
fi

# Instalar/actualizar dependencias de Composer
echo "📦 Instalando dependencias de Composer..."
/usr/bin/composer install --no-dev --optimize-autoloader

# Limpiar caché de configuración (usando PHP 8.2 para compatibilidad con servidor web)
echo "🧹 Limpiando caché de Laravel..."
$PHP_BIN artisan config:clear
$PHP_BIN artisan cache:clear
$PHP_BIN artisan route:clear
$PHP_BIN artisan view:clear

# Limpiar cache de bootstrap también
rm -rf bootstrap/cache/*.php 2>/dev/null || true

# Ejecutar migraciones si las hay
echo "🗄️ Ejecutando migraciones de base de datos..."
$PHP_BIN artisan migrate --force

# Crear symlink de storage si no existe
echo "🔗 Creando symlink de storage..."
$PHP_BIN artisan storage:link

# Asegurar permisos de storage y logs
echo "🔐 Configurando permisos de storage y logs..."

# Crear todos los directorios necesarios
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

# Detectar usuario del servidor web (para CyberPanel/LiteSpeed)
WEB_USER="apihe9688"
if id "$WEB_USER" >/dev/null 2>&1; then
    echo "   Usuario detectado: $WEB_USER"
else
    # Intentar detectar desde procesos PHP-FPM pool
    PHP_FPM_USER=$(ps aux | grep 'php-fpm: pool' | grep -v grep | head -1 | awk '{print $1}' | grep -v root)
    if [ ! -z "$PHP_FPM_USER" ]; then
        WEB_USER="$PHP_FPM_USER"
        echo "   Usuario PHP-FPM detectado: $WEB_USER"
    else
        WEB_USER="www-data"
        echo "   Usando usuario por defecto: $WEB_USER"
    fi
fi

# Eliminar archivo de log existente si tiene permisos incorrectos (se recreará con permisos correctos)
if [ -f storage/logs/laravel.log ]; then
    rm -f storage/logs/laravel.log 2>/dev/null || sudo rm -f storage/logs/laravel.log 2>/dev/null || true
fi

# Configurar permisos
chmod -R 775 storage 2>/dev/null || sudo chmod -R 775 storage || {
    echo "   ⚠️  Error al configurar permisos de storage, intentando con sudo..."
    sudo chmod -R 775 storage || echo "   ❌ No se pudieron configurar permisos de storage"
}

chmod -R 775 bootstrap/cache 2>/dev/null || sudo chmod -R 775 bootstrap/cache || {
    echo "   ⚠️  Error al configurar permisos de bootstrap/cache, intentando con sudo..."
    sudo chmod -R 775 bootstrap/cache || echo "   ❌ No se pudieron configurar permisos de bootstrap/cache"
}

# Para CyberPanel, usar permisos más permisivos en storage/logs (777 para directorio, 666 para archivo)
chmod -R 777 storage/logs 2>/dev/null || sudo chmod -R 777 storage/logs || {
    echo "   ⚠️  Error al configurar permisos de storage/logs, intentando con sudo..."
    sudo chmod -R 777 storage/logs || echo "   ❌ No se pudieron configurar permisos de storage/logs"
}

# Crear archivo de log con permisos correctos
touch storage/logs/laravel.log 2>/dev/null || sudo touch storage/logs/laravel.log || {
    echo "   ⚠️  Error al crear archivo de log, intentando con sudo..."
    sudo touch storage/logs/laravel.log || echo "   ❌ No se pudo crear el archivo de log"
}

# Usar 666 para el archivo de log (necesario para CyberPanel)
chmod 666 storage/logs/laravel.log 2>/dev/null || sudo chmod 666 storage/logs/laravel.log || true

# Configurar ownership
chown -R $WEB_USER:$WEB_USER storage 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de storage, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER storage || echo "   ❌ No se pudo configurar ownership de storage"
}

chown -R $WEB_USER:$WEB_USER bootstrap/cache 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de bootstrap/cache, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache || echo "   ❌ No se pudo configurar ownership de bootstrap/cache"
}

chown -R $WEB_USER:$WEB_USER storage/logs 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage/logs 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de storage/logs, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER storage/logs || echo "   ❌ No se pudo configurar ownership de storage/logs"
}

# Asegurar que el archivo de log tiene el ownership correcto
chown $WEB_USER:$WEB_USER storage/logs/laravel.log 2>/dev/null || sudo chown $WEB_USER:$WEB_USER storage/logs/laravel.log 2>/dev/null || true

echo "   ✅ Permisos de storage configurados"

# Instalar logo de Hela-ditos (después del git pull)
echo "🖼️  Instalando logo de Hela-ditos..."
LOGO_SOURCE="public/images/logo-heladitos.jpg"
LOGO_DEST="public/images/logo.jpg"

if [ -f "$LOGO_SOURCE" ]; then
    # Crear directorio si no existe
    mkdir -p public/images
    
    # Copiar logo-heladitos.jpg a logo.jpg
    cp "$LOGO_SOURCE" "$LOGO_DEST"
    
    # Configurar permisos
    chmod 644 "$LOGO_DEST" 2>/dev/null || sudo chmod 644 "$LOGO_DEST" || true
    chown $WEB_USER:$WEB_USER "$LOGO_DEST" 2>/dev/null || sudo chown $WEB_USER:$WEB_USER "$LOGO_DEST" || true
    
    # Actualizar base de datos con URL correcta
    $PHP_BIN artisan tinker --execute="
        \$url = 'https://api.hela-ditos.com.ar/images/logo.jpg';
        \App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\$url)]);
        echo '✅ Logo configurado: ' . \$url . PHP_EOL;
    " || echo "   ⚠️  Error al actualizar logo en BD"
    
    echo "   ✅ Logo de Hela-ditos instalado correctamente"
else
    echo "   ⚠️  Logo fuente no encontrado: $LOGO_SOURCE (omitido)"
fi

# Optimizar para producción (usando PHP 8.2)
echo "⚡ Optimizando para producción..."
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache

echo "✅ Deployment del backend completado exitosamente!"
echo "🌐 API: https://api.hela-ditos.com.ar"

