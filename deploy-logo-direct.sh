#!/bin/bash
echo "🔧 Solucionando el problema del logo en producción..."

echo "1️⃣ Copiando logo al servidor..."
scp -P 5507 apps/backend/public/images/logo.jpg posdeployer@149.50.138.145:/tmp/logo.jpg

ssh -p 5507 posdeployer@149.50.138.145 << 'REMOTE'
    mkdir -p /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos
    cp /tmp/logo.jpg /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/
    chmod -R 775 /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage
    chown -R www-data:www-data /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage
    rm /tmp/logo.jpg
    ls -lah /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/
REMOTE

echo "✅ Logo deployado. Ahora actualiza la URL desde la interfaz web."
