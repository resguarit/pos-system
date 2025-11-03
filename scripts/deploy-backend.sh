#!/bin/bash

# Script de deployment para el backend Laravel
# Este script se ejecuta en el servidor VPS

echo "🚀 Iniciando deployment del backend..."

# Cambiar al directorio del proyecto
cd /home/api.heroedelwhisky.com.ar/public_html

# Hacer pull de los últimos cambios
echo "📥 Obteniendo últimos cambios del repositorio..."
git pull origin master

# Cambiar al directorio del backend Laravel
cd apps/backend

# Instalar/actualizar dependencias de Composer
echo "📦 Instalando dependencias de Composer..."
/usr/bin/composer install --no-dev --optimize-autoloader

# Limpiar caché de configuración
echo "🧹 Limpiando caché de Laravel..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Ejecutar migraciones si las hay
echo "🗄️ Ejecutando migraciones de base de datos..."
php artisan migrate --force

# Crear symlink de storage si no existe
echo "🔗 Creando symlink de storage..."
php artisan storage:link

# Asegurar permisos de storage y logs
echo "🔐 Configurando permisos de storage y logs..."

# Crear todos los directorios necesarios
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

# Detectar usuario del servidor web (prioridad: PHP-FPM pool > nginx > apache > www-data)
WEB_USER="www-data"

# Primero intentar detectar desde procesos PHP-FPM pool (más específico para CyberPanel)
PHP_FPM_USER=$(ps aux | grep 'php-fpm: pool' | grep -v grep | head -1 | awk '{print $1}' | grep -v root)
if [ ! -z "$PHP_FPM_USER" ]; then
    WEB_USER="$PHP_FPM_USER"
    echo "   Usuario PHP-FPM detectado: $WEB_USER"
elif id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
    echo "   Usuario nginx detectado: $WEB_USER"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
    echo "   Usuario apache detectado: $WEB_USER"
else
    # Intentar detectar desde procesos PHP/web generales
    DETECTED_USER=$(ps aux | grep -E '(php-fpm|nginx|apache)' | grep -v grep | grep -v pool | head -1 | awk '{print $1}' | sed 's/root/www-data/')
    if [ ! -z "$DETECTED_USER" ] && [ "$DETECTED_USER" != "root" ]; then
        WEB_USER="$DETECTED_USER"
        echo "   Usuario detectado desde procesos: $WEB_USER"
    else
        echo "   Usando usuario por defecto: $WEB_USER"
    fi
fi

# Eliminar archivo de log existente si tiene permisos incorrectos (se recreará con permisos correctos)
if [ -f storage/logs/laravel.log ]; then
    rm -f storage/logs/laravel.log 2>/dev/null || sudo rm -f storage/logs/laravel.log 2>/dev/null || true
fi

# Configurar permisos (usando sudo si es necesario)
chmod -R 775 storage 2>/dev/null || sudo chmod -R 775 storage || {
    echo "   ⚠️  Error al configurar permisos de storage con chmod, intentando con sudo..."
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

# Configurar ownership (usando sudo si es necesario)
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

# Instalar logo de Héroe del Whisky (después del git pull)
echo "🖼️  Instalando logo de Héroe del Whisky..."
LOGO_DEST="public/images/logo.jpg"
LOGO_INSTALLED=false

# Crear directorio si no existe
mkdir -p public/images

# Prioridad 1: Buscar logo-heroe.jpg o logo-heroedelwhisky.jpg en public/images (versionado en repo)
LOGO_SOURCE=""
for logo_file in "public/images/logo-heroe.jpg" "public/images/logo-heroedelwhisky.jpg" "public/images/logo-whisky.jpg"; do
    if [ -f "$logo_file" ]; then
        LOGO_SOURCE="$logo_file"
        break
    fi
done

if [ -n "$LOGO_SOURCE" ]; then
    echo "   📋 Encontrado logo en repo: $LOGO_SOURCE"
    cp "$LOGO_SOURCE" "$LOGO_DEST"
    LOGO_INSTALLED=true
else
    # Prioridad 2: Buscar logo más reciente en storage/app/public/system/logos
    if [ -d "storage/app/public/system/logos" ]; then
        LATEST_LOGO=$(ls -t storage/app/public/system/logos/*.jpg storage/app/public/system/logos/*.png 2>/dev/null | head -1)
        if [ -n "$LATEST_LOGO" ]; then
            echo "   📋 Encontrado logo en storage: $LATEST_LOGO"
            cp "$LATEST_LOGO" "$LOGO_DEST"
            LOGO_INSTALLED=true
        fi
    fi
fi

# Si se encontró y copió un logo, configurar permisos y BD
if [ "$LOGO_INSTALLED" = true ]; then
    # Configurar permisos
    chmod 644 "$LOGO_DEST" 2>/dev/null || sudo chmod 644 "$LOGO_DEST" || true
    chown $WEB_USER:$WEB_USER "$LOGO_DEST" 2>/dev/null || sudo chown $WEB_USER:$WEB_USER "$LOGO_DEST" || true
    
    # Actualizar base de datos con URL correcta
    php artisan tinker --execute="
        \$url = 'https://api.heroedelwhisky.com.ar/images/logo.jpg';
        \App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\$url)]);
        echo '✅ Logo configurado: ' . \$url . PHP_EOL;
    " || echo "   ⚠️  Error al actualizar logo en BD"
    
    echo "   ✅ Logo de Héroe del Whisky instalado correctamente"
else
    # Si no se encontró ningún logo, verificar si ya existe uno
    if [ -f "$LOGO_DEST" ]; then
        echo "   ℹ️  Logo ya existe en $LOGO_DEST (no se modificó)"
        # Asegurar permisos correctos del logo existente
        chmod 644 "$LOGO_DEST" 2>/dev/null || sudo chmod 644 "$LOGO_DEST" || true
        chown $WEB_USER:$WEB_USER "$LOGO_DEST" 2>/dev/null || sudo chown $WEB_USER:$WEB_USER "$LOGO_DEST" || true
    else
        echo "   ⚠️  Logo no encontrado en ninguna ubicación (public/images/logo-heroe.jpg ni storage/app/public/system/logos/)"
        echo "   💡 Usa el script fix-logos-both-systems.sh para restaurar el logo manualmente"
    fi
fi

# Optimizar para producción
echo "⚡ Optimizando para producción..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ejecutar seeders si es necesario (comentado por defecto)
# echo "🌱 Ejecutando seeders..."
# php artisan db:seed --force

echo "✅ Deployment del backend completado exitosamente!"