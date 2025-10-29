#!/bin/bash

echo "🔧 Arreglando permisos para que git pull funcione..."

# Ir al directorio del repositorio
cd /home/api.heroedelwhisky.com.ar/public_html

# Cambiar owner de todos los archivos
chown -R posdeployer:posgroup .

# Cambiar permisos
find . -type f -exec chmod 664 {} \;
find . -type d -exec chmod 775 {} \;

# Dar permisos de ejecución a scripts
chmod +x scripts/*.sh 2>/dev/null

echo "✅ Permisos arreglados!"

# Ahora intentar git reset
cd apps/backend

echo "🔄 Forzando actualización de código..."
git fetch origin
git reset --hard origin/master

echo "✅ Código actualizado!"

# Limpiar y reconstruir
echo "🧹 Limpiando caché..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "⚙️ Reconstruyendo..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Listo! Intenta subir el logo ahora."

