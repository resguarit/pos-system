#!/bin/bash

# Script genérico para subir logo a cualquier cliente
# Uso: ./scripts/upload-logo.sh /ruta/al/logo.jpg [cliente-config.env]
# Si no se especifica cliente, mostrará opciones disponibles

LOGO_FILE="$1"
CLIENT_CONFIG="$2"

# Verificar que se proporcionó el archivo de logo
if [ -z "$LOGO_FILE" ]; then
    echo "❌ Error: Necesitas especificar la ruta del archivo de logo"
    echo ""
    echo "Uso:"
    echo "  ./scripts/upload-logo.sh /ruta/local/al/logo.jpg [cliente-config.env]"
    echo ""
    echo "Ejemplos:"
    echo "  ./scripts/upload-logo.sh ~/Desktop/logo.jpg hela-ditos-config.env"
    echo "  ./scripts/upload-logo.sh ~/Desktop/logo.jpg vps-config.env"
    echo "  ./scripts/upload-logo.sh ~/Desktop/logo.jpg"
    echo ""
    echo "Si no especificas cliente, se mostrarán las opciones disponibles."
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Error: El archivo no existe: $LOGO_FILE"
    exit 1
fi

# Si no se especificó cliente, mostrar opciones
if [ -z "$CLIENT_CONFIG" ]; then
    echo "📋 Selecciona el cliente:"
    echo ""
    
    CONFIGS=($(ls -1 *.env 2>/dev/null | grep -E "(client-|vps-|hela-)" | grep -v ".local"))
    
    if [ ${#CONFIGS[@]} -eq 0 ]; then
        echo "❌ No se encontraron archivos de configuración de cliente"
        echo "   Buscando archivos: *-config.env en el directorio raíz"
        exit 1
    fi
    
    INDEX=1
    for config in "${CONFIGS[@]}"; do
        CLIENT_NAME=$(basename "$config" .env | sed 's/-config//')
        echo "  [$INDEX] $CLIENT_NAME ($config)"
        ((INDEX++))
    done
    
    echo ""
    read -p "Ingresa el número del cliente: " SELECTION
    
    if [[ ! "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#CONFIGS[@]} ]; then
        echo "❌ Selección inválida"
        exit 1
    fi
    
    CLIENT_CONFIG="${CONFIGS[$((SELECTION-1))]}"
fi

# Verificar que el archivo de configuración existe
if [ ! -f "$CLIENT_CONFIG" ]; then
    echo "❌ Error: Archivo de configuración no encontrado: $CLIENT_CONFIG"
    exit 1
fi

echo "📄 Cargando configuración desde: $CLIENT_CONFIG"
echo ""

# Cargar variables del archivo de configuración
source "$CLIENT_CONFIG"

# Variables requeridas con valores por defecto
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-posdeployer}"
BACKEND_DEPLOY_BASE="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html}"
BACKEND_DOMAIN="${BACKEND_DOMAIN:-api.heroedelwhisky.com.ar}"

# Asegurar que BACKEND_PATH incluya /apps/backend si no está presente
if [[ "$BACKEND_DEPLOY_BASE" == */apps/backend ]]; then
    BACKEND_PATH="$BACKEND_DEPLOY_BASE"
else
    BACKEND_PATH="${BACKEND_DEPLOY_BASE}/apps/backend"
fi

# Verificar variables críticas
if [ -z "$BACKEND_PATH" ]; then
    echo "❌ Error: BACKEND_DEPLOY_PATH no está configurado en $CLIENT_CONFIG"
    exit 1
fi

echo "🔧 Configuración:"
echo "   Cliente: $(basename $CLIENT_CONFIG .env)"
echo "   Servidor: ${VPS_USERNAME}@${VPS_HOST}:${VPS_PORT}"
echo "   Ruta Backend: $BACKEND_PATH"
echo "   Dominio: $BACKEND_DOMAIN"
echo "   Logo: $LOGO_FILE"
echo ""

# Extraer extensión del archivo
LOGO_EXT="${LOGO_FILE##*.}"
TEMP_FILE="/tmp/logo_upload_$(date +%s).${LOGO_EXT}"

# Detectar clave SSH o Host alias configurado
SSH_HOST="${VPS_USERNAME}@${VPS_HOST}"
SSH_OPTIONS="-p ${VPS_PORT}"

# Verificar si hay un Host SSH configurado para este servidor
if grep -q "HostName ${VPS_HOST}" ~/.ssh/config 2>/dev/null; then
    SSH_ALIAS=$(grep -B 1 "HostName ${VPS_HOST}" ~/.ssh/config | grep "^Host " | head -1 | awk '{print $2}')
    if [ -n "$SSH_ALIAS" ] && [ "$SSH_ALIAS" != "Host" ]; then
        SSH_HOST="$SSH_ALIAS"
        SSH_OPTIONS=""  # El Host ya incluye puerto y usuario
        echo "🔑 Usando configuración SSH: Host $SSH_ALIAS"
    fi
fi

# Si no hay alias, intentar detectar clave SSH específica
if [ "$SSH_OPTIONS" != "" ]; then
    SSH_KEY_OPTION=""
    if [ -n "$VPS_SSH_KEY_PATH" ] && [ -f "$VPS_SSH_KEY_PATH" ]; then
        SSH_KEY_OPTION="-i $VPS_SSH_KEY_PATH"
        echo "🔑 Usando clave SSH: $VPS_SSH_KEY_PATH"
    elif [ -f ~/.ssh/pos_deploy_key ] && [ "$VPS_USERNAME" = "posdeployer" ]; then
        SSH_KEY_OPTION="-i ~/.ssh/pos_deploy_key"
        echo "🔑 Usando clave SSH: ~/.ssh/pos_deploy_key"
    elif [ -f ~/.ssh/vps_key ] && [ "$VPS_USERNAME" = "root" ]; then
        SSH_KEY_OPTION="-i ~/.ssh/vps_key"
        echo "🔑 Usando clave SSH: ~/.ssh/vps_key"
    elif [ -f ~/.ssh/id_ed25519 ]; then
        SSH_KEY_OPTION="-i ~/.ssh/id_ed25519"
        echo "🔑 Usando clave SSH: ~/.ssh/id_ed25519"
    elif [ -f ~/.ssh/id_rsa ]; then
        SSH_KEY_OPTION="-i ~/.ssh/id_rsa"
        echo "🔑 Usando clave SSH: ~/.ssh/id_rsa"
    else
        echo "⚠️  No se encontró clave SSH. Se intentará autenticación interactiva (contraseña)"
    fi
    SSH_OPTIONS="${SSH_KEY_OPTION} ${SSH_OPTIONS}"
fi

echo ""
echo "📤 Subiendo logo al servidor..."
echo "   Se te pedirá la contraseña si no tienes clave SSH configurada"
echo ""

# Subir el archivo
scp ${SSH_OPTIONS} "$LOGO_FILE" ${SSH_HOST}:${TEMP_FILE}

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al subir el archivo"
    echo ""
    echo "💡 Posibles soluciones:"
    echo "   1. Verifica que tengas acceso SSH al servidor"
    echo "   2. Configura una clave SSH en $CLIENT_CONFIG: VPS_SSH_KEY_PATH=~/.ssh/id_rsa"
    echo "   3. O prueba conectarte manualmente: ssh ${SSH_OPTIONS} ${SSH_HOST}"
    exit 1
fi

echo "✅ Archivo subido correctamente"
echo ""

# Determinar URL base
if [[ "$BACKEND_DOMAIN" == *"https://"* ]] || [[ "$BACKEND_DOMAIN" == *"http://"* ]]; then
    BASE_URL="${BACKEND_DOMAIN}"
else
    BASE_URL="https://${BACKEND_DOMAIN}"
fi

# Preparar comandos para ejecutar en el servidor
SSH_CMD="cd ${BACKEND_PATH} && "
SSH_CMD+="mkdir -p public/images 2>/dev/null && "
SSH_CMD+="mkdir -p storage/app/public/system/logos 2>/dev/null && "

# Obtener el nombre del usuario/grupo del propietario del directorio
SSH_CMD+="OWNER=\$(stat -c '%U:%G' storage 2>/dev/null || stat -f '%u:%g' storage 2>/dev/null || echo 'www-data:www-data') && "

# Copiar logo a public/images/ (método simple)
SSH_CMD+="cp ${TEMP_FILE} public/images/logo.${LOGO_EXT} && "
SSH_CMD+="chmod 644 public/images/logo.${LOGO_EXT} 2>/dev/null || true && "
SSH_CMD+="chown \$(echo \$OWNER | cut -d: -f1) public/images/logo.${LOGO_EXT} 2>/dev/null || true && "

# También guardar en storage con timestamp
SSH_CMD+="LOGO_NAME=\"logo_\$(date +%s).${LOGO_EXT}\" && "
SSH_CMD+="cp ${TEMP_FILE} \"storage/app/public/system/logos/\$LOGO_NAME\" && "
SSH_CMD+="chmod 664 \"storage/app/public/system/logos/\$LOGO_NAME\" 2>/dev/null || true && "
SSH_CMD+="chown \$(echo \$OWNER | cut -d: -f1) \"storage/app/public/system/logos/\$LOGO_NAME\" 2>/dev/null || true && "

# Limpiar archivo temporal
SSH_CMD+="rm -f ${TEMP_FILE} && "

# Actualizar base de datos con URL
SSH_CMD+="php artisan tinker --execute=\""
SSH_CMD+="\\\$url = '${BASE_URL}/images/logo.${LOGO_EXT}'; "
SSH_CMD+="\\App\\Models\\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode(\\\$url)]); "
SSH_CMD+="echo '✅ Logo configurado: ' . \\\$url;"
SSH_CMD+="\" && "
SSH_CMD+="echo \"\" && "
SSH_CMD+="echo \"✅ Logo subido correctamente\" && "
SSH_CMD+="echo \"📁 Ubicaciones:\" && "
SSH_CMD+="echo \"   - public/images/logo.${LOGO_EXT}\" && "
SSH_CMD+="echo \"   - storage/app/public/system/logos/\$LOGO_NAME\" && "
SSH_CMD+="echo \"🌐 URL: ${BASE_URL}/images/logo.${LOGO_EXT}\""

# Ejecutar comandos en el servidor
echo "🔧 Configurando logo en el servidor..."
ssh ${SSH_OPTIONS} ${SSH_HOST} "$SSH_CMD"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Logo subido y configurado correctamente"
    echo ""
    echo "📋 Resumen:"
    echo "   Cliente: $(basename $CLIENT_CONFIG .env)"
    echo "   URL del logo: ${BASE_URL}/images/logo.${LOGO_EXT}"
    echo ""
    echo "💡 Tip: Recarga la página para ver el logo actualizado"
else
    echo "❌ Error al configurar el logo en el servidor"
    exit 1
fi

