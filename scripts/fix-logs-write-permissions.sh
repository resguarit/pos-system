#!/bin/bash

# Script para corregir permisos de escritura en logs
# Soluciona el problema cuando posdeployer no puede escribir

echo "🔧 Corrigiendo permisos de escritura en logs..."
echo ""

# Configuración del servidor
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BASE_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html}"

echo "📍 Conectando a ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo ""

ssh -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << ENDSSH

BASE_PATH="${BASE_PATH}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 CORRECCIÓN DE PERMISOS DE ESCRITURA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detectar ruta del backend
if [ -d "\$BASE_PATH/apps/backend" ]; then
    BACKEND_PATH="\$BASE_PATH/apps/backend"
elif [ -d "\$BASE_PATH/app/backend" ]; then
    BACKEND_PATH="\$BASE_PATH/app/backend"
else
    BACKEND_PATH="\$BASE_PATH"
fi

echo "📂 Backend path: \$BACKEND_PATH"
cd "\$BACKEND_PATH" || exit 1

# Detectar usuario del servidor web
WEB_USER="www-data"
if id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
fi

CURRENT_USER=\$(whoami)
echo "👤 Usuario actual: \$CURRENT_USER"
echo "🌐 Usuario del servidor web: \$WEB_USER"
echo ""

# Verificar grupos actuales
echo "1️⃣ Verificando grupos del usuario actual..."
CURRENT_GROUPS=\$(groups \$CURRENT_USER 2>/dev/null || id -Gn \$CURRENT_USER 2>/dev/null)
echo "   Grupos actuales: \$CURRENT_GROUPS"

if echo "\$CURRENT_GROUPS" | grep -q "\$WEB_USER"; then
    echo "✅ El usuario \$CURRENT_USER ya está en el grupo \$WEB_USER"
else
    echo "⚠️  El usuario \$CURRENT_USER NO está en el grupo \$WEB_USER"
    echo "   Agregando usuario al grupo..."
    sudo usermod -aG \$WEB_USER \$CURRENT_USER
    if [ \$? -eq 0 ]; then
        echo "✅ Usuario agregado al grupo \$WEB_USER"
        echo "   ⚠️  Nota: Puede ser necesario cerrar sesión y reconectarse para que el cambio tome efecto"
    else
        echo "❌ No se pudo agregar el usuario al grupo (puede requerir permisos root)"
    fi
fi

echo ""
echo "2️⃣ Configurando permisos de storage/logs..."
# Asegurar que el directorio existe
mkdir -p storage/logs

# Configurar permisos con setgid para que los nuevos archivos hereden el grupo
sudo chmod 2775 storage/logs 2>/dev/null || chmod 2775 storage/logs 2>/dev/null
sudo chmod -R 775 storage/logs 2>/dev/null || chmod -R 775 storage/logs 2>/dev/null

# Configurar ownership
sudo chown -R \$WEB_USER:\$WEB_USER storage/logs 2>/dev/null || chown -R \$WEB_USER:\$WEB_USER storage/logs 2>/dev/null

# Configurar permisos del archivo de log si existe
if [ -f "storage/logs/laravel.log" ]; then
    sudo chmod 664 storage/logs/laravel.log 2>/dev/null || chmod 664 storage/logs/laravel.log 2>/dev/null
    sudo chown \$WEB_USER:\$WEB_USER storage/logs/laravel.log 2>/dev/null || chown \$WEB_USER:\$WEB_USER storage/logs/laravel.log 2>/dev/null
fi

echo ""
echo "3️⃣ Configurando permisos de todo storage..."
sudo chmod -R 775 storage 2>/dev/null || chmod -R 775 storage 2>/dev/null || true
sudo chmod -R 775 bootstrap/cache 2>/dev/null || chmod -R 775 bootstrap/cache 2>/dev/null || true
sudo chown -R \$WEB_USER:\$WEB_USER storage 2>/dev/null || chown -R \$WEB_USER:\$WEB_USER storage 2>/dev/null || true
sudo chown -R \$WEB_USER:\$WEB_USER bootstrap/cache 2>/dev/null || chown -R \$WEB_USER:\$WEB_USER bootstrap/cache 2>/dev/null || true

echo ""
echo "4️⃣ Verificando permisos finales..."
echo "📁 storage/logs:"
ls -ld storage/logs

if [ -f "storage/logs/laravel.log" ]; then
    echo "📄 storage/logs/laravel.log:"
    ls -l storage/logs/laravel.log
fi

echo ""
echo "5️⃣ Probando escritura..."
TEST_FILE="storage/logs/test_write_\$\$.txt"
if touch "\$TEST_FILE" 2>/dev/null; then
    echo "✅ ÉXITO: Se puede escribir en storage/logs"
    rm -f "\$TEST_FILE"
else
    echo "❌ Aún hay problemas de escritura"
    echo ""
    echo "💡 Solución alternativa:"
    echo "   1. Cierra sesión SSH y reconéctate (para que el nuevo grupo tome efecto)"
    echo "   2. O ejecuta: newgrp \$WEB_USER"
    echo "   3. O usa sudo para comandos que requieren escritura"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORRECCIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENDSSH

echo ""
echo "✅ Script completado!"
echo ""
echo "💡 Si aún no puedes escribir:"
echo "   1. Cierra la sesión SSH y reconéctate"
echo "   2. O ejecuta: newgrp www-data"
echo "   3. Luego prueba de nuevo: touch storage/logs/test.txt"

