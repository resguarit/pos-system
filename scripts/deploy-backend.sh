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

# Optimizar para producción
echo "⚡ Optimizando para producción..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ejecutar seeders si es necesario (comentado por defecto)
# echo "🌱 Ejecutando seeders..."
# php artisan db:seed --force

echo "✅ Deployment del backend completado exitosamente!"