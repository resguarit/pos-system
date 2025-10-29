#!/bin/bash

# Script SIMPLIFICADO para subir logo
# Lo coloca directamente en public/images/ donde es accesible sin configuración extra

LOGO_FILE="$1"
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"

if [ -z "$LOGO_FILE" ]; then
    echo "❌ Uso: ./scripts/upload-logo-simple.sh /ruta/al/logo.jpg"
    exit 1
fi

if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Error: El archivo no existe: $LOGO_FILE"
    exit 1
fi

echo "📤 Subiendo logo de forma simple..."
echo "   Archivo: $LOGO_FILE"

# Subir directamente a public/images/
scp -P ${VPS_PORT} "$LOGO_FILE" ${VPS_USERNAME}@${VPS_HOST}:/tmp/logo.jpg

if [ $? -eq 0 ]; then
    echo "✅ Archivo subido"
    
    # En el servidor: mover a public/images/ y actualizar BD
    ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << 'ENDSSH'
        cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
        
        # Crear directorio si no existe
        mkdir -p public/images
        
        # Mover logo
        mv /tmp/logo.jpg public/images/logo.jpg
        
        # Configurar permisos simples
        chmod 644 public/images/logo.jpg
        chown apihe4729:apihe4729 public/images/logo.jpg
        
        # Actualizar base de datos con URL simple
        php artisan tinker --execute="\$url = 'https://api.heroedelwhisky.com.ar/images/logo.jpg'; \App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\$url)]); echo '✅ Logo configurado: ' . \$url;"
        
        echo ""
        echo "✅ Logo subido a: public/images/logo.jpg"
        echo "🌐 URL: https://api.heroedelwhisky.com.ar/images/logo.jpg"
ENDSSH
    
    echo ""
    echo "✅ ¡Listo! Recarga la página para ver el logo"
else
    echo "❌ Error al subir"
fi

