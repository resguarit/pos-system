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

# Detectar usuario del servidor web
WEB_USER="www-data"
if id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
else
    # Intentar detectar desde procesos PHP/web
    DETECTED_USER=$(ps aux | grep -E '(nginx|apache|php-fpm)' | grep -v grep | head -1 | awk '{print $1}' | sed 's/root/www-data/')
    if [ ! -z "$DETECTED_USER" ] && [ "$DETECTED_USER" != "root" ]; then
        WEB_USER="$DETECTED_USER"
    fi
fi

echo "   Usuario del servidor web detectado: $WEB_USER"

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

chmod -R 775 storage/logs 2>/dev/null || sudo chmod -R 775 storage/logs || {
    echo "   ⚠️  Error al configurar permisos de storage/logs, intentando con sudo..."
    sudo chmod -R 775 storage/logs || echo "   ❌ No se pudieron configurar permisos de storage/logs"
}

# Crear archivo de log con permisos correctos
touch storage/logs/laravel.log 2>/dev/null || sudo touch storage/logs/laravel.log || {
    echo "   ⚠️  Error al crear archivo de log, intentando con sudo..."
    sudo touch storage/logs/laravel.log || echo "   ❌ No se pudo crear el archivo de log"
}

chmod 664 storage/logs/laravel.log 2>/dev/null || sudo chmod 664 storage/logs/laravel.log || true

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

# Optimizar para producción
echo "⚡ Optimizando para producción..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ejecutar seeders si es necesario (comentado por defecto)
# echo "🌱 Ejecutando seeders..."
# php artisan db:seed --force

echo "✅ Deployment del backend completado exitosamente!"