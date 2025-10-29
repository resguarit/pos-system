#!/bin/bash

# Script para subir logo manualmente al servidor
# Uso: ./scripts/upload-logo-manual.sh /ruta/local/al/logo.jpg

if [ -z "$1" ]; then
    echo "❌ Error: Necesitas especificar la ruta del archivo de logo"
    echo ""
    echo "Uso:"
    echo "  ./scripts/upload-logo-manual.sh /ruta/local/al/logo.jpg"
    echo ""
    echo "Ejemplo:"
    echo "  ./scripts/upload-logo-manual.sh ~/Desktop/logo.jpg"
    exit 1
fi

LOGO_FILE="$1"
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BACKEND_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html/apps/backend}"

# Verificar que el archivo existe
if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Error: El archivo no existe: $LOGO_FILE"
    exit 1
fi

echo "📤 Subiendo logo al servidor..."
echo "   Archivo: $LOGO_FILE"
echo "   Servidor: ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"

# Subir el archivo
scp -P ${VPS_PORT} "$LOGO_FILE" ${VPS_USERNAME}@${VPS_HOST}:/tmp/logo_upload_$(date +%s).tmp

if [ $? -eq 0 ]; then
    echo "✅ Archivo subido correctamente"
    
    # Mover el archivo a la ubicación correcta en el servidor
    SSH_CMD="cd $BACKEND_PATH && "
    SSH_CMD+="mkdir -p storage/app/public/system/logos && "
    SSH_CMD+="chmod -R 775 storage/app/public/system/logos && "
    SSH_CMD+="LOGO_FILE=\$(ls -t /tmp/logo_upload_*.tmp 2>/dev/null | head -1) && "
    SSH_CMD+="if [ -n \"\$LOGO_FILE\" ]; then "
    SSH_CMD+="  LOGO_NAME=\"logo_\$(date +%s).\${LOGO_FILE##*.}\" && "
    SSH_CMD+="  mv \"\$LOGO_FILE\" \"storage/app/public/system/logos/\$LOGO_NAME\" && "
    SSH_CMD+="  chown apihe4729:apihe4729 \"storage/app/public/system/logos/\$LOGO_NAME\" && "
    SSH_CMD+="  chmod 664 \"storage/app/public/system/logos/\$LOGO_NAME\" && "
    SSH_CMD+="  echo \"✅ Logo movido a: storage/app/public/system/logos/\$LOGO_NAME\" && "
    SSH_CMD+="  LOGO_URL=\"/storage/system/logos/\$LOGO_NAME\" && "
    SSH_CMD+="  php artisan tinker --execute=\"\\\\App\\\\Models\\\\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\\\\\$LOGO_URL)]);\" && "
    SSH_CMD+="  echo \"✅ Logo URL guardada en base de datos: \$LOGO_URL\" && "
    SSH_CMD+="  echo \"\" && "
    SSH_CMD+="  echo \"🌐 URL del logo: https://api.heroedelwhisky.com.ar\$LOGO_URL\" && "
    SSH_CMD+="  echo \"✅ Logo configurado correctamente\" "
    SSH_CMD+="else "
    SSH_CMD+="  echo \"❌ No se encontró el archivo subido\" "
    SSH_CMD+="fi"
    
    ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} "$SSH_CMD"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Logo subido y configurado correctamente"
    else
        echo "❌ Error al configurar el logo"
    fi
else
    echo "❌ Error al subir el archivo"
    exit 1
fi

