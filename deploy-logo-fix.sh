#!/bin/bash

echo "🔧 Solucionando el problema del logo en producción..."

# Paso 1: Copiar el logo al servidor
echo "1️⃣ Copiando logo al servidor..."
scp -P 5507 apps/backend/public/images/logo.jpg posdeployer@149.50.138.145:/tmp/logo.jpg

# Paso 2: Ejecutar comandos en el servidor
ssh -p 5507 posdeployer@149.50.138.145 << 'REMOTE'
    echo "2️⃣ Creando directorio de storage..."
    mkdir -p /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos
    
    echo "3️⃣ Copiando logo a storage..."
    cp /tmp/logo.jpg /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/
    
    echo "4️⃣ Configurando permisos..."
    chmod -R 775 /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage
    chown -R www-data:www-data /home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage
    
    echo "5️⃣ Actualizando base de datos..."
    mysql -u pos_user -p'vps_POS2024!' pos_system << 'SQL'
        UPDATE settings 
        SET value = '"/api/storage/system/logos/logo.jpg"' 
        WHERE \`key\` = 'logo_url';
        
        SELECT * FROM settings WHERE \`key\` = 'logo_url';
SQL
    
    echo "6️⃣ Limpiando archivos temporales..."
    rm /tmp/logo.jpg
    
    echo "✅ Proceso completado!"
    echo ""
    echo "Verifica el logo en: https://heroedelwhisky.com.ar/configuracion"
REMOTE

echo ""
echo "✅ Logo deployado exitosamente!"
