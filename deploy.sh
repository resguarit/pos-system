#!/bin/bash

# Script de despliegue automático
# Uso: ./deploy.sh

echo "🚀 Iniciando despliegue..."

# 1. Actualizar código
echo "📥 Bajando cambios de git..."
git pull origin master

# 2. Backend
echo "🐘 Actualizando Backend..."
cd apps/backend

# Instalar dependencias de PHP (opcional, descomentar si es necesario)
# echo "📦 Instalando dependencias de Composer..."
# composer install --no-dev --optimize-autoloader

# Correr migraciones
echo "🗄️ Ejecutando migraciones..."
php artisan migrate --force

# Limpiar caché
echo "🧹 Limpiando caché de Laravel..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ../..

# 3. Frontend
echo "⚛️ Actualizando Frontend..."
cd apps/frontend

# Instalar dependencias de Node (por si hay nuevas)
echo "📦 Instalando dependencias de NPM..."
npm install

# Construir la aplicación
echo "🏗️ Construyendo aplicación React..."
npm run build

cd ../..

echo "✅ Despliegue finalizado con éxito!"
echo "👉 No olvides refrescar tu navegador con Ctrl+F5"
