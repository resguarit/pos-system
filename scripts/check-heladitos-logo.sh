#!/bin/bash

# Script rápido para verificar el logo de Hela-ditos

VPS_HOST="200.58.127.86"
VPS_PORT="5614"
VPS_USER="root"
BACKEND_PATH="/home/api.hela-ditos.com.ar/public_html/apps/backend"

echo "🔍 Verificando logo de Hela-ditos..."
echo ""

ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    cd /home/api.hela-ditos.com.ar/public_html/apps/backend
    
    echo "1️⃣ Archivo físico en public/images/logo.jpg:"
    if [ -f "public/images/logo.jpg" ]; then
        echo "   ✅ Existe"
        ls -lh public/images/logo.jpg
        file public/images/logo.jpg | head -1
    else
        echo "   ❌ NO existe"
    fi
    
    echo ""
    echo "2️⃣ Configuración en base de datos:"
    php artisan tinker --execute="
        \$setting = \App\Models\Setting::where('key', 'logo_url')->first();
        if (\$setting) {
            \$value = json_decode(\$setting->value, true);
            echo '   Logo URL: ' . (\$value ?: 'null') . PHP_EOL;
        } else {
            echo '   Logo URL: No configurado' . PHP_EOL;
        }
    "
    
    echo ""
    echo "3️⃣ APP_URL en .env:"
    grep "APP_URL" .env | head -1
    
    echo ""
    echo "4️⃣ Verificando si el logo es accesible:"
    APP_URL=$(grep "APP_URL" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ -z "$APP_URL" ]; then
        APP_URL="https://api.hela-ditos.com.ar"
    fi
    echo "   Probando: $APP_URL/images/logo.jpg"
    curl -I "$APP_URL/images/logo.jpg" 2>/dev/null | head -3 || echo "   ❌ No accesible"
    
ENDSSH

echo ""
echo "✅ Verificación completada"



