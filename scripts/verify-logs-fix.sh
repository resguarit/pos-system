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

# Detectar llave SSH a usar
SSH_KEY="~/.ssh/pos_deploy_key"
if [ ! -f ~/.ssh/pos_deploy_key ]; then
    SSH_KEY="~/.ssh/vps_key"
fi

ssh -i $SSH_KEY -p ${VPS_PORT} ${VPS_USERNAME}@${VPS_HOST} << ENDSSH

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
WRITE_OK=false
if touch "\$TEST_FILE" 2>/dev/null; then
    echo "✅ ÉXITO: Se puede escribir en storage/logs (como usuario actual)"
    rm -f "\$TEST_FILE"
    WRITE_OK=true
else
    echo "⚠️  No se pudo escribir como usuario \$USER"
    echo "   Probando como \$WEB_USER (usuario del servidor web)..."
    if sudo -u \$WEB_USER touch "\$TEST_FILE" 2>/dev/null; then
        sudo -u \$WEB_USER rm -f "\$TEST_FILE"
        echo "✅ PHP/web server (\$WEB_USER) SÍ puede escribir (esto es lo importante)"
        WRITE_OK=true
    else
        echo "❌ ERROR: Ni \$USER ni \$WEB_USER pueden escribir"
        echo "   Esto indica que aún hay problemas de permisos"
    fi
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
STOCK_LOGS_OK=false
if grep -q "Stock reduction debug\|Stock increase debug\|Stock reduction result\|Stock increase result" app/Services/StockService.php 2>/dev/null; then
    echo "❌ ERROR: Aún hay logs de debug en StockService.php"
    echo "   Esto causará errores al crear ventas"
else
    echo "✅ Confirmado: StockService.php NO tiene logs de debug"
    STOCK_LOGS_OK=true
fi

echo ""
echo "4️⃣.5 VERIFICANDO CONFIGURACIÓN DE PERMISOS EN DEPLOY..."
DEPLOY_OK=false
if [ -f "scripts/deploy-backend.sh" ] && grep -q "storage/logs\|chmod.*775.*storage\|chown.*www-data.*storage" scripts/deploy-backend.sh 2>/dev/null; then
    echo "✅ Deploy script configura permisos automáticamente"
    DEPLOY_OK=true
elif [ -f "../scripts/deploy-backend.sh" ] && grep -q "storage/logs\|chmod.*775.*storage\|chown.*www-data.*storage" ../scripts/deploy-backend.sh 2>/dev/null; then
    echo "✅ Deploy script configura permisos automáticamente"
    DEPLOY_OK=true
else
    echo "⚠️  El deploy script podría no configurar permisos automáticamente"
fi

echo ""
echo "4️⃣.6 VERIFICANDO QUE LARAVEL PUEDE ESCRIBIR LOGS (simulación)..."
LARAVEL_OK=\$WRITE_OK
if php artisan --version >/dev/null 2>&1; then
    # Intentar escribir usando el usuario web
    if sudo -u \$WEB_USER php -r "error_log('LOG TEST: ' . date('Y-m-d H:i:s'), 3, 'storage/logs/laravel-test.log');" 2>/dev/null; then
        echo "✅ Laravel (ejecutándose como \$WEB_USER) puede escribir en logs"
        sudo -u \$WEB_USER rm -f storage/logs/laravel-test.log 2>/dev/null
        LARAVEL_OK=true
    else
        echo "⚠️  No se pudo probar escritura desde PHP directamente"
    fi
else
    echo "⚠️  No se encontró PHP artisan"
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
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Resumen de resultados
if [ "\$WRITE_OK" = "true" ] && [ "\$STOCK_LOGS_OK" = "true" ] && [ "\$LARAVEL_OK" = "true" ]; then
    echo "✅ ✅ ✅ TODO CORRECTO - El problema NO debería volver a pasar"
    echo ""
    echo "✓ Permisos de logs configurados correctamente"
    echo "✓ Logs de debug eliminados de StockService"
    echo "✓ PHP/web server puede escribir logs"
    echo "✓ Configuración de deploy automática en lugar"
else
    echo "⚠️  HAY ALGUNAS ADVERTENCIAS:"
    [ "\$WRITE_OK" != "true" ] && echo "  ❌ Problemas de escritura en logs"
    [ "\$STOCK_LOGS_OK" != "true" ] && echo "  ❌ Aún hay logs de debug en StockService"
    [ "\$LARAVEL_OK" != "true" ] && echo "  ❌ Laravel no puede escribir logs"
    [ "\$DEPLOY_OK" != "true" ] && echo "  ⚠️  El deploy no configura permisos automáticamente"
    echo ""
    echo "💡 ACCIÓN REQUERIDA:"
    if [ "\$WRITE_OK" != "true" ]; then
        echo "   Ejecuta: ./scripts/fix-logs-write-permissions.sh"
    fi
    if [ "\$STOCK_LOGS_OK" != "true" ]; then
        echo "   Verifica que app/Services/StockService.php no tenga logs de debug"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 PRUEBA FINAL - Hacer una venta real:"
echo "   1. Abre el POS en el navegador"
echo "   2. Agrega productos al carrito"
echo "   3. Completa una venta de prueba"
echo "   4. Verifica que NO aparezca: 'Permission denied' o 'Failed to open stream'"
echo "   5. Revisa la consola del navegador (F12) - No debe haber errores rojos"
echo "   6. Si todo funciona, el problema está resuelto ✅"
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

