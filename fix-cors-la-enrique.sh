#!/bin/bash
# Script para resolver el preflight OPTIONS 403 en api.laenriquetabar.com.ar

echo "=== Fixing CORS preflight 403 for api.laenriquetabar.com.ar ==="

# 1. Crear el .htaccess correcto para el backend (sin headers hardcodeados)
# Laravel manejará CORS a través del middleware HandleCors
cat > /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # NO responder preflight OPTIONS aquí - dejar que Laravel lo maneje
    # Esto permite que el middleware HandleCors procese la petición correctamente

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Handle X-XSRF-Token Header
    RewriteCond %{HTTP:x-xsrf-token} .
    RewriteRule .* - [E=HTTP_X_XSRF_TOKEN:%{HTTP:X-XSRF-Token}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
EOF

echo "✓ .htaccess creado en apps/backend/public/"

# 2. Verificar permisos
WEB_USER="laenr8748"
if id "$WEB_USER" >/dev/null 2>&1; then
    chown "$WEB_USER:$WEB_USER" /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess
    chmod 644 /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess
    echo "✓ Permisos configurados para usuario: $WEB_USER"
else
    echo "⚠️  Usuario $WEB_USER no encontrado, usando permisos por defecto"
    chmod 644 /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess
fi

# 3. Mostrar el contenido para confirmar
echo ""
echo "=== Contenido del .htaccess ==="
cat /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess
echo ""

# 4. Verificar y limpiar cache de Laravel
echo ""
echo "=== Limpiando cache de Laravel ==="
cd /home/api.laenriquetabar.com.ar/public_html/apps/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
echo "✓ Cache de Laravel limpiado y regenerado"

# 5. Verificar que FRONTEND_URL esté configurado en .env
echo ""
echo "=== Verificando configuración .env ==="
if grep -q "FRONTEND_URL=https://laenriquetabar.com.ar" .env; then
    echo "✓ FRONTEND_URL está configurado correctamente"
else
    echo "⚠️  ADVERTENCIA: FRONTEND_URL no está configurado en .env"
    echo "   Agrega esta línea al .env:"
    echo "   FRONTEND_URL=https://laenriquetabar.com.ar"
fi

# 6. Instrucciones finales
echo ""
echo "=== Próximos pasos ==="
echo "1. Reinicia OpenLiteSpeed desde CyberPanel:"
echo "   Server → LiteSpeed Status → Restart"
echo ""
echo "2. Verifica el preflight con este comando:"
echo "   curl -i -X OPTIONS https://api.laenriquetabar.com.ar/api/login \\"
echo "     -H \"Origin: https://laenriquetabar.com.ar\" \\"
echo "     -H \"Access-Control-Request-Method: POST\""
echo ""
echo "   Debe devolver HTTP/2 200 con Access-Control-Allow-Origin: https://laenriquetabar.com.ar"

