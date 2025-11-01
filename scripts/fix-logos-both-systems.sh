#!/bin/bash

# Script para diagnosticar y corregir logos en ambos sistemas
# Hela-ditos y Héroe del Whisky

set -e

echo "🔍 Diagnóstico de Logos - Sistemas Multi-Cliente"
echo "================================================"
echo ""

# Configuración Hela-ditos
HELADITOS_VPS_HOST="200.58.127.86"
HELADITOS_VPS_PORT="5614"
HELADITOS_VPS_USER="root"
HELADITOS_BACKEND_PATH="/home/api.hela-ditos.com.ar/public_html/apps/backend"
HELADITOS_BACKEND_DOMAIN="api.hela-ditos.com.ar"

# Configuración Héroe del Whisky (necesitas ajustar estos valores)
HEROE_VPS_HOST="${HEROE_VPS_HOST:-149.50.138.145}"
HEROE_VPS_PORT="${HEROE_VPS_PORT:-5507}"
HEROE_VPS_USER="${HEROE_VPS_USER:-posdeployer}"
HEROE_BACKEND_PATH="${HEROE_BACKEND_PATH:-/home/api.heroedelwhisky.com.ar/public_html/apps/backend}"
HEROE_BACKEND_DOMAIN="${HEROE_BACKEND_DOMAIN:-api.heroedelwhisky.com.ar}"

# Función para diagnosticar un sistema
diagnose_system() {
    local SYSTEM_NAME=$1
    local VPS_HOST=$2
    local VPS_PORT=$3
    local VPS_USER=$4
    local BACKEND_PATH=$5
    local BACKEND_DOMAIN=$6
    
    echo "📋 Diagnosticando: $SYSTEM_NAME"
    echo "--------------------------------"
    
    ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${BACKEND_PATH} || exit 1
        
        echo "1️⃣ Verificando logo en public/images/logo.jpg:"
        if [ -f "public/images/logo.jpg" ]; then
            echo "   ✅ Archivo existe"
            ls -lh public/images/logo.jpg
        else
            echo "   ❌ Archivo NO existe"
        fi
        
        echo ""
        echo "2️⃣ Verificando configuración en base de datos:"
        php artisan tinker --execute="
            \$setting = \App\Models\Setting::where('key', 'logo_url')->first();
            if (\$setting) {
                \$value = json_decode(\$setting->value, true);
                echo '   Logo URL en BD: ' . (\$value ?: 'null') . PHP_EOL;
            } else {
                echo '   Logo URL en BD: No configurado' . PHP_EOL;
            }
        " || echo "   ⚠️ Error al consultar BD"
        
        echo ""
        echo "3️⃣ Verificando archivos en storage:"
        if [ -d "storage/app/public/system/logos" ]; then
            echo "   Directorio existe, archivos:"
            ls -lh storage/app/public/system/logos/ | head -5 || echo "   (vacío)"
        else
            echo "   ❌ Directorio no existe"
        fi
        
        echo ""
        echo "4️⃣ Verificando APP_URL en .env:"
        grep "APP_URL" .env | head -1 || echo "   ⚠️ No encontrado"
        
        echo ""
        echo "5️⃣ Probando acceso HTTP al logo:"
        APP_URL=\$(grep "APP_URL" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -z "\$APP_URL" ]; then
            APP_URL="https://${BACKEND_DOMAIN}"
        fi
        echo "   URL de prueba: \$APP_URL/images/logo.jpg"
        curl -I "\$APP_URL/images/logo.jpg" 2>/dev/null | head -2 || echo "   ❌ No accesible vía HTTP"
        
ENDSSH
    
    echo ""
}

# Función para corregir logo de un sistema
fix_logo() {
    local SYSTEM_NAME=$1
    local VPS_HOST=$2
    local VPS_PORT=$3
    local VPS_USER=$4
    local BACKEND_PATH=$5
    local BACKEND_DOMAIN=$6
    
    echo "🔧 Corrigiendo logo: $SYSTEM_NAME"
    echo "--------------------------------"
    
    ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${BACKEND_PATH} || exit 1
        
        # Crear directorio si no existe
        mkdir -p public/images
        mkdir -p storage/app/public/system/logos
        
        # Obtener usuario del servidor web
        OWNER=\$(stat -c '%U:%G' storage 2>/dev/null || stat -f '%u:%g' storage 2>/dev/null || echo 'www-data:www-data')
        OWNER_USER=\$(echo \$OWNER | cut -d: -f1)
        
        # Si existe logo en storage, copiarlo a public/images
        if [ -d "storage/app/public/system/logos" ]; then
            LATEST_LOGO=\$(ls -t storage/app/public/system/logos/*.jpg storage/app/public/system/logos/*.png 2>/dev/null | head -1)
            if [ -n "\$LATEST_LOGO" ]; then
                echo "📋 Encontrado logo en storage: \$LATEST_LOGO"
                echo "   Copiando a public/images/logo.jpg..."
                cp "\$LATEST_LOGO" public/images/logo.jpg
                chmod 644 public/images/logo.jpg
                chown \$OWNER_USER public/images/logo.jpg
                echo "   ✅ Logo copiado"
            else
                echo "   ⚠️ No hay logos en storage"
            fi
        fi
        
        # Actualizar BD con URL correcta
        echo ""
        echo "📝 Actualizando configuración en BD..."
        php artisan tinker --execute="
            \$url = 'https://${BACKEND_DOMAIN}/images/logo.jpg';
            \App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\$url)]);
            echo '✅ Logo URL configurado: ' . \$url . PHP_EOL;
        " || echo "   ⚠️ Error al actualizar BD"
        
        echo ""
        echo "✅ Corrección completada para $SYSTEM_NAME"
        echo "   URL del logo: https://${BACKEND_DOMAIN}/images/logo.jpg"
        
ENDSSH
    
    echo ""
}

# Menú principal
echo "Selecciona una opción:"
echo "1. Diagnosticar Hela-ditos"
echo "2. Diagnosticar Héroe del Whisky"
echo "3. Diagnosticar ambos sistemas"
echo "4. Corregir logo de Hela-ditos"
echo "5. Corregir logo de Héroe del Whisky"
echo "6. Corregir ambos sistemas"
echo "7. Solo mostrar configuración de BD (sin cambios)"
echo ""
read -p "Opción [1-7]: " OPTION

case $OPTION in
    1)
        diagnose_system "Hela-ditos" "$HELADITOS_VPS_HOST" "$HELADITOS_VPS_PORT" "$HELADITOS_VPS_USER" "$HELADITOS_BACKEND_PATH" "$HELADITOS_BACKEND_DOMAIN"
        ;;
    2)
        diagnose_system "Héroe del Whisky" "$HEROE_VPS_HOST" "$HEROE_VPS_PORT" "$HEROE_VPS_USER" "$HEROE_BACKEND_PATH" "$HEROE_BACKEND_DOMAIN"
        ;;
    3)
        diagnose_system "Hela-ditos" "$HELADITOS_VPS_HOST" "$HELADITOS_VPS_PORT" "$HELADITOS_VPS_USER" "$HELADITOS_BACKEND_PATH" "$HELADITOS_BACKEND_DOMAIN"
        echo ""
        echo "================================================"
        echo ""
        diagnose_system "Héroe del Whisky" "$HEROE_VPS_HOST" "$HEROE_VPS_PORT" "$HEROE_VPS_USER" "$HEROE_BACKEND_PATH" "$HEROE_BACKEND_DOMAIN"
        ;;
    4)
        read -p "⚠️ ¿Estás seguro de corregir el logo de Hela-ditos? (s/n): " CONFIRM
        if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
            fix_logo "Hela-ditos" "$HELADITOS_VPS_HOST" "$HELADITOS_VPS_PORT" "$HELADITOS_VPS_USER" "$HELADITOS_BACKEND_PATH" "$HELADITOS_BACKEND_DOMAIN"
        fi
        ;;
    5)
        read -p "⚠️ ¿Estás seguro de corregir el logo de Héroe del Whisky? (s/n): " CONFIRM
        if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
            fix_logo "Héroe del Whisky" "$HEROE_VPS_HOST" "$HEROE_VPS_PORT" "$HEROE_VPS_USER" "$HEROE_BACKEND_PATH" "$HEROE_BACKEND_DOMAIN"
        fi
        ;;
    6)
        read -p "⚠️ ¿Estás seguro de corregir ambos logos? (s/n): " CONFIRM
        if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
            fix_logo "Hela-ditos" "$HELADITOS_VPS_HOST" "$HELADITOS_VPS_PORT" "$HELADITOS_VPS_USER" "$HELADITOS_BACKEND_PATH" "$HELADITOS_BACKEND_DOMAIN"
            echo ""
            echo "================================================"
            echo ""
            fix_logo "Héroe del Whisky" "$HEROE_VPS_HOST" "$HEROE_VPS_PORT" "$HEROE_VPS_USER" "$HEROE_BACKEND_PATH" "$HEROE_BACKEND_DOMAIN"
        fi
        ;;
    7)
        echo "📊 Configuración de logos en BD:"
        echo ""
        echo "Hela-ditos:"
        ssh -p ${HELADITOS_VPS_PORT} ${HELADITOS_VPS_USER}@${HELADITOS_VPS_HOST} "cd ${HELADITOS_BACKEND_PATH} && php artisan tinker --execute=\"\\\$s = \\\App\\\Models\\\Setting::where('key', 'logo_url')->first(); echo (\\\$s ? json_decode(\\\$s->value, true) : 'null') . PHP_EOL;\""
        echo ""
        echo "Héroe del Whisky:"
        ssh -p ${HEROE_VPS_PORT} ${HEROE_VPS_USER}@${HEROE_VPS_HOST} "cd ${HEROE_BACKEND_PATH} && php artisan tinker --execute=\"\\\$s = \\\App\\\Models\\\Setting::where('key', 'logo_url')->first(); echo (\\\$s ? json_decode(\\\$s->value, true) : 'null') . PHP_EOL;\""
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "✅ Proceso completado"

