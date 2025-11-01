#!/bin/bash

# Script específico para subir logo de Hela-ditos
# Este script pide la contraseña SSH interactivamente

LOGO_FILE="${1:-/Users/naimguarino/Documents/Resguar IT/logo.jpg}"
VPS_HOST="200.58.127.86"
VPS_PORT="5614"
VPS_USERNAME="root"
BACKEND_PATH="/home/api.hela-ditos.com.ar/public_html/apps/backend"
BACKEND_DOMAIN="api.hela-ditos.com.ar"

if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Error: El archivo no existe: $LOGO_FILE"
    exit 1
fi

echo "📤 Subiendo logo de Hela-ditos..."
echo "   Archivo: $LOGO_FILE"
echo "   Servidor: ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo ""
echo "⚠️  Se te pedirá la contraseña SSH para el servidor"
echo ""

# Extraer extensión
LOGO_EXT="${LOGO_FILE##*.}"
TEMP_FILE="/tmp/logo_upload_$(date +%s).${LOGO_EXT}"

# Subir el archivo (esto pedirá contraseña interactivamente)
echo "📤 Subiendo archivo al servidor..."
scp -P ${VPS_PORT} "$LOGO_FILE" ${VPS_USERNAME}@${VPS_HOST}:${TEMP_FILE}

if [ $? -ne 0 ]; then
    echo "❌ Error al subir el archivo"
    echo ""
    echo "💡 Asegúrate de tener:"
    echo "   1. Acceso SSH al servidor"
    echo "   2. La contraseña correcta"
    echo "   3. O configura una clave SSH autorizada"
    exit 1
fi

echo "✅ Archivo subido correctamente"
echo ""

# Configurar el logo en el servidor
echo "🔧 Configurando logo en el servidor..."
ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << ENDSSH
cd ${BACKEND_PATH}

# Crear directorios si no existen
mkdir -p public/images
mkdir -p storage/app/public/system/logos

# Copiar logo a public/images/
cp ${TEMP_FILE} public/images/logo.${LOGO_EXT}

# Obtener usuario del servidor web
OWNER=\$(stat -c '%U:%G' storage 2>/dev/null || stat -f '%u:%g' storage 2>/dev/null || echo 'www-data:www-data')

# Configurar permisos
chmod 644 public/images/logo.${LOGO_EXT} 2>/dev/null || true
chown \$(echo \$OWNER | cut -d: -f1) public/images/logo.${LOGO_EXT} 2>/dev/null || true

# También guardar en storage con timestamp
LOGO_NAME="logo_\$(date +%s).${LOGO_EXT}"
cp ${TEMP_FILE} "storage/app/public/system/logos/\$LOGO_NAME"
chmod 664 "storage/app/public/system/logos/\$LOGO_NAME" 2>/dev/null || true
chown \$(echo \$OWNER | cut -d: -f1) "storage/app/public/system/logos/\$LOGO_NAME" 2>/dev/null || true

# Limpiar archivo temporal
rm -f ${TEMP_FILE}

# Actualizar base de datos
php artisan tinker --execute="
\\\$url = 'https://${BACKEND_DOMAIN}/images/logo.${LOGO_EXT}';
\\App\\Models\\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\\\$url)]);
echo '✅ Logo configurado: ' . \\\$url;
"

echo ""
echo "✅ Logo subido correctamente"
echo "📁 Ubicaciones:"
echo "   - public/images/logo.${LOGO_EXT}"
echo "   - storage/app/public/system/logos/\$LOGO_NAME"
echo "🌐 URL: https://${BACKEND_DOMAIN}/images/logo.${LOGO_EXT}"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Logo subido y configurado correctamente"
    echo ""
    echo "📋 Resumen:"
    echo "   Cliente: Hela-ditos"
    echo "   URL del logo: https://${BACKEND_DOMAIN}/images/logo.${LOGO_EXT}"
    echo ""
    echo "💡 Tip: Recarga la página para ver el logo actualizado"
else
    echo "❌ Error al configurar el logo en el servidor"
    exit 1
fi

