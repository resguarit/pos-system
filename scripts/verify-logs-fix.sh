#!/bin/bash

# Script para verificar que los permisos de logs están correctos y que no hay errores

echo "🔍 Verificando solución de permisos de logs..."
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
echo "🔍 VERIFICACIÓN DE PERMISOS Y LOGS"
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

echo ""
echo "1️⃣ VERIFICANDO PERMISOS DE STORAGE/LOGS"
echo "─────────────────────────────────────────────────────────────────────────────"
ls -ld storage/logs 2>/dev/null && echo "✅ Directorio storage/logs existe" || echo "❌ Directorio storage/logs NO existe"

if [ -f "storage/logs/laravel.log" ]; then
    echo "✅ Archivo laravel.log existe"
    ls -l storage/logs/laravel.log | awk '{print "📄 Permisos: " $1 " | Owner: " $3 ":" $4 " | Archivo: " $9}'
else
    echo "⚠️  Archivo laravel.log NO existe (se creará automáticamente)"
fi

# Verificar permisos
if [ -d "storage/logs" ]; then
    PERMS=\$(stat -c "%a" storage/logs 2>/dev/null || stat -f "%OLp" storage/logs 2>/dev/null)
    echo "📊 Permisos del directorio: \$PERMS"
    if [ "\$PERMS" = "775" ] || [ "\$PERMS" = "2775" ]; then
        echo "✅ Permisos correctos (775)"
    else
        echo "⚠️  Permisos actuales: \$PERMS (deberían ser 775)"
    fi
fi

echo ""
echo "2️⃣ PROBANDO ESCRITURA EN LOGS"
echo "─────────────────────────────────────────────────────────────────────────────"
TEST_FILE="storage/logs/test_write_\$\$.txt"
if touch "\$TEST_FILE" 2>/dev/null; then
    echo "✅ ÉXITO: Se puede escribir en storage/logs"
    rm -f "\$TEST_FILE"
else
    echo "❌ ERROR: NO se puede escribir en storage/logs"
    echo "   Esto indica que aún hay problemas de permisos"
fi

echo ""
echo "3️⃣ REVISANDO ÚLTIMOS ERRORES EN LOGS"
echo "─────────────────────────────────────────────────────────────────────────────"
if [ -f "storage/logs/laravel.log" ]; then
    echo "📋 Últimas 10 líneas de error del log:"
    echo ""
    tail -20 storage/logs/laravel.log | grep -i "error\|exception\|failed\|denied" | tail -10 || echo "✅ No se encontraron errores recientes en el log"
    echo ""
    echo "📋 Últimas líneas del log (general):"
    tail -5 storage/logs/laravel.log
else
    echo "⚠️  No hay archivo de log aún"
fi

echo ""
echo "4️⃣ VERIFICANDO QUE NO HAY LOGS DE DEBUG DE STOCK EN EL CÓDIGO"
echo "─────────────────────────────────────────────────────────────────────────────"
if grep -r "Stock reduction debug\|Stock increase debug\|Stock reduction result\|Stock increase result" app/Services/StockService.php 2>/dev/null; then
    echo "⚠️  ADVERTENCIA: Aún hay logs de debug en StockService.php"
else
    echo "✅ Confirmado: No hay logs de debug en StockService.php"
fi

echo ""
echo "5️⃣ VERIFICANDO CONFIGURACIÓN DE LARAVEL"
echo "─────────────────────────────────────────────────────────────────────────────"
if [ -f ".env" ]; then
    APP_ENV=\$(grep "^APP_ENV=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    APP_DEBUG=\$(grep "^APP_DEBUG=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    echo "🌍 APP_ENV: \$APP_ENV"
    echo "🐛 APP_DEBUG: \$APP_DEBUG"
    if [ "\$APP_DEBUG" = "true" ]; then
        echo "⚠️  APP_DEBUG está en true (debería ser false en producción)"
    else
        echo "✅ APP_DEBUG está desactivado"
    fi
else
    echo "⚠️  No se encontró archivo .env"
fi

echo ""
echo "6️⃣ VERIFICANDO USUARIO DEL SERVIDOR WEB"
echo "─────────────────────────────────────────────────────────────────────────────"
WEB_USER="www-data"
if id nginx >/dev/null 2>&1; then
    WEB_USER="nginx"
elif id apache >/dev/null 2>&1; then
    WEB_USER="apache"
fi
echo "👤 Usuario del servidor web: \$WEB_USER"

# Verificar ownership
if [ -d "storage/logs" ]; then
    OWNER=\$(stat -c "%U:%G" storage/logs 2>/dev/null || stat -f "%Su:%Sg" storage/logs 2>/dev/null)
    echo "👥 Owner actual de storage/logs: \$OWNER"
    if echo "\$OWNER" | grep -q "\$WEB_USER"; then
        echo "✅ Ownership correcto"
    else
        echo "⚠️  Ownership debería ser \$WEB_USER:\$WEB_USER"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 PRÓXIMOS PASOS PARA PROBAR:"
echo "   1. Abre el POS en el navegador"
echo "   2. Agrega productos al carrito"
echo "   3. Completa una venta de prueba"
echo "   4. Verifica que NO aparezca el error de permisos"
echo "   5. Revisa la consola del navegador (F12) para errores"
echo ""

ENDSSH

echo ""
echo "✅ Verificación completada!"
echo ""
echo "📝 RESUMEN:"
echo "   • Verifica los permisos de storage/logs arriba"
echo "   • Revisa si hay errores recientes en los logs"
echo "   • Prueba hacer una venta desde el POS"
echo ""

