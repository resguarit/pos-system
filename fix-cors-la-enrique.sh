#!/bin/bash
# Script para resolver el preflight OPTIONS 403 en api.laenriquetabar.com.ar

echo "=== Fixing CORS preflight 403 for api.laenriquetabar.com.ar ==="

# 1. Crear el .htaccess correcto para el backend
cat > /home/api.laenriquetabar.com.ar/public_html/apps/backend/public/.htaccess << 'EOF'
<IfModule mod_headers.c>
  Header always set Access-Control-Allow-Origin "https://laenriquetabar.com.ar"
  Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  Header always set Access-Control-Allow-Credentials "true"
</IfModule>

RewriteEngine On

# Responder preflight OPTIONS con 204
RewriteCond %{REQUEST_METHOD} =OPTIONS
RewriteRule ^.*$ - [R=204,L]

# Front controller de Laravel
RewriteCond %{REQUEST_URI} !^/index\.php$
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L]
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

# 4. Instrucciones finales
echo "=== Próximos pasos ==="
echo "1. Reinicia OpenLiteSpeed desde CyberPanel:"
echo "   Server → LiteSpeed Status → Restart"
echo ""
echo "2. Verifica el preflight con este comando:"
echo "   curl -i -X OPTIONS https://api.laenriquetabar.com.ar/api/login \\"
echo "     -H \"Origin: https://laenriquetabar.com.ar\" \\"
echo "     -H \"Access-Control-Request-Method: POST\""
echo ""
echo "   Debe devolver HTTP/2 204 con Access-Control-Allow-Origin"

