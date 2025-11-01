#!/bin/bash

# Script para instalar el logo de Hela-ditos en el servidor
# Ejecutar en el servidor después de hacer git pull

BACKEND_PATH="/home/api.hela-ditos.com.ar/public_html/apps/backend"
LOGO_SOURCE="$BACKEND_PATH/public/images/logo-heladitos.jpg"
LOGO_DEST="$BACKEND_PATH/public/images/logo.jpg"

echo "🔧 Instalando logo de Hela-ditos..."

if [ ! -f "$LOGO_SOURCE" ]; then
    echo "❌ Error: No se encontró el logo en: $LOGO_SOURCE"
    echo "   Asegúrate de hacer 'git pull' primero"
    exit 1
fi

cd "$BACKEND_PATH" || exit 1

# Crear directorios si no existen
mkdir -p public/images
mkdir -p storage/app/public/system/logos

# Copiar logo a public/images/logo.jpg
cp "$LOGO_SOURCE" "$LOGO_DEST"

# Obtener usuario del servidor web
OWNER=$(stat -c '%U:%G' storage 2>/dev/null || stat -f '%u:%g' storage 2>/dev/null || echo 'www-data:www-data')

# Configurar permisos
chmod 644 "$LOGO_DEST" 2>/dev/null || true
chown $(echo $OWNER | cut -d: -f1) "$LOGO_DEST" 2>/dev/null || true

# También guardar en storage con timestamp
LOGO_NAME="logo_$(date +%s).jpg"
cp "$LOGO_SOURCE" "storage/app/public/system/logos/$LOGO_NAME"
chmod 664 "storage/app/public/system/logos/$LOGO_NAME" 2>/dev/null || true
chown $(echo $OWNER | cut -d: -f1) "storage/app/public/system/logos/$LOGO_NAME" 2>/dev/null || true

# Actualizar base de datos
php artisan tinker --execute="
\$url = 'https://api.hela-ditos.com.ar/images/logo.jpg';
\App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\$url)]);
echo '✅ Logo configurado: ' . \$url;
"

echo ""
echo "✅ Logo instalado correctamente"
echo "📁 Ubicaciones:"
echo "   - public/images/logo.jpg"
echo "   - storage/app/public/system/logos/$LOGO_NAME"
echo "🌐 URL: https://api.hela-ditos.com.ar/images/logo.jpg"

