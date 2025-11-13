#!/bin/bash
# Script para mover archivos del frontend desde dist/ a la raíz

FRONTEND_PATH="/home/laenriquetabar.com.ar/public_html"
WEB_USER="laenr8748"

echo "🔧 Moviendo archivos del frontend a la raíz..."

# Verificar que dist existe
if [ ! -d "$FRONTEND_PATH/dist" ]; then
    echo "❌ ERROR: No existe el directorio dist/"
    echo "📂 Contenido de $FRONTEND_PATH:"
    ls -la "$FRONTEND_PATH"
    exit 1
fi

# Verificar que index.html existe en dist
if [ ! -f "$FRONTEND_PATH/dist/index.html" ]; then
    echo "❌ ERROR: No existe index.html en dist/"
    echo "📂 Contenido de dist/:"
    ls -la "$FRONTEND_PATH/dist"
    exit 1
fi

echo "✅ Encontrado dist/ con archivos"

# Mover archivos desde dist/ a la raíz
echo "📦 Moviendo archivos desde dist/ a la raíz..."
cd "$FRONTEND_PATH"

# Mover todos los archivos y directorios (incluyendo ocultos)
shopt -s dotglob
mv dist/* . 2>/dev/null || {
    echo "⚠️  Error moviendo archivos, intentando con permisos..."
    sudo mv dist/* . || {
        echo "❌ No se pudieron mover los archivos"
        exit 1
    }
}
shopt -u dotglob

# Eliminar directorio dist/ vacío
rmdir dist 2>/dev/null || true

# Configurar permisos
echo "🔐 Configurando permisos..."
if id "$WEB_USER" >/dev/null 2>&1; then
    chown -R "$WEB_USER:$WEB_USER" "$FRONTEND_PATH" 2>/dev/null || sudo chown -R "$WEB_USER:$WEB_USER" "$FRONTEND_PATH" || true
    find "$FRONTEND_PATH" -type d -exec chmod 755 {} \; 2>/dev/null || sudo find "$FRONTEND_PATH" -type d -exec chmod 755 {} \; || true
    find "$FRONTEND_PATH" -type f -exec chmod 644 {} \; 2>/dev/null || sudo find "$FRONTEND_PATH" -type f -exec chmod 644 {} \; || true
    echo "✅ Permisos configurados para usuario: $WEB_USER"
else
    echo "⚠️  Usuario $WEB_USER no encontrado"
fi

# Verificar que index.html ahora existe
if [ -f "$FRONTEND_PATH/index.html" ]; then
    echo "✅ index.html movido correctamente"
    echo ""
    echo "📋 Archivos en la raíz:"
    ls -la "$FRONTEND_PATH" | head -15
else
    echo "❌ ERROR: index.html no se movió correctamente"
    exit 1
fi

echo ""
echo "✅ Frontend corregido correctamente"
echo "🌐 Prueba acceder a: https://laenriquetabar.com.ar"


