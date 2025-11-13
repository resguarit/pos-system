#!/bin/bash
# Script para corregir error 404 en La Enrique Tabar

echo "🔧 Corrigiendo error 404 en La Enrique Tabar..."

FRONTEND_PATH="/home/laenriquetabar.com.ar/public_html"
WEB_USER="laenr8748"

# 1. Verificar que index.html existe
echo "📋 Verificando archivos..."
if [ ! -f "$FRONTEND_PATH/index.html" ]; then
    echo "❌ ERROR: index.html no existe en $FRONTEND_PATH"
    echo "📂 Contenido del directorio:"
    ls -la "$FRONTEND_PATH" || true
    exit 1
fi
echo "✅ index.html encontrado"

# 2. Crear/actualizar .htaccess
echo "📝 Creando .htaccess..."
cat > "$FRONTEND_PATH/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Si el archivo o directorio existe, servirlo directamente
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Si no existe, servir index.html (para React Router)
  RewriteRule . /index.html [L]
</IfModule>
EOF

# 3. Configurar permisos
echo "🔐 Configurando permisos..."
if id "$WEB_USER" >/dev/null 2>&1; then
    chown "$WEB_USER:$WEB_USER" "$FRONTEND_PATH/.htaccess"
    chmod 644 "$FRONTEND_PATH/.htaccess"
    echo "✅ Permisos configurados para usuario: $WEB_USER"
else
    echo "⚠️  Usuario $WEB_USER no encontrado, usando permisos por defecto"
    chmod 644 "$FRONTEND_PATH/.htaccess"
fi

# 4. Verificar Document Root en CyberPanel
echo ""
echo "📋 Verificando configuración..."
echo "Document Root debería ser: $FRONTEND_PATH"
echo ""
echo "Para verificar en CyberPanel:"
echo "1. Ve a Websites → laenriquetabar.com.ar → Manage"
echo "2. Verifica que 'Document Root' sea: $FRONTEND_PATH"
echo "3. Asegúrate de que 'Auto Load .htaccess' esté habilitado"
echo ""

# 5. Verificar que el .htaccess se creó correctamente
if [ -f "$FRONTEND_PATH/.htaccess" ]; then
    echo "✅ .htaccess creado correctamente"
    echo ""
    echo "📄 Contenido del .htaccess:"
    cat "$FRONTEND_PATH/.htaccess"
    echo ""
else
    echo "❌ ERROR: No se pudo crear .htaccess"
    exit 1
fi

# 6. Verificar permisos de index.html
if [ -f "$FRONTEND_PATH/index.html" ]; then
    chown "$WEB_USER:$WEB_USER" "$FRONTEND_PATH/index.html" 2>/dev/null || true
    chmod 644 "$FRONTEND_PATH/index.html" 2>/dev/null || true
    echo "✅ Permisos de index.html configurados"
fi

echo ""
echo "🔄 Próximos pasos:"
echo "1. Reinicia LiteSpeed desde CyberPanel:"
echo "   Server → LiteSpeed Status → Restart"
echo ""
echo "2. Verifica que el Document Root esté correcto en CyberPanel"
echo ""
echo "3. Prueba acceder a: https://laenriquetabar.com.ar"


