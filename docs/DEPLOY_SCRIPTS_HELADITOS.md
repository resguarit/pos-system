# Scripts de Deployment para Hela Ditos

## 📋 Configuración Inicial

Para que el deployment automático funcione correctamente, necesitas copiar los scripts de deployment al VPS.

### 1. Copiar Scripts al VPS

Conéctate al VPS de Hela Ditos:

```bash
ssh root@200.58.127.86
```

Luego copia los scripts al directorio home:

```bash
# Crear los scripts en el home
cat > ~/deploy-backend-heladitos.sh << 'EOFSCRIPT'
#!/bin/bash

# Script de deployment para el backend Laravel - Hela Ditos
# Este script se ejecuta en el servidor VPS

echo "🚀 Iniciando deployment del backend (Hela Ditos)..."

# Cambiar al directorio del proyecto
cd /home/api.hela-ditos.com.ar/public_html

# Hacer pull de los últimos cambios
echo "📥 Obteniendo últimos cambios del repositorio..."
git pull origin master

# Cambiar al directorio del backend Laravel
cd apps/backend

# Instalar/actualizar dependencias de Composer
echo "📦 Instalando dependencias de Composer..."
/usr/bin/composer install --no-dev --optimize-autoloader

# Limpiar caché de configuración
echo "🧹 Limpiando caché de Laravel..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Ejecutar migraciones si las hay
echo "🗄️ Ejecutando migraciones de base de datos..."
php artisan migrate --force

# Crear symlink de storage si no existe
echo "🔗 Creando symlink de storage..."
php artisan storage:link

# Asegurar permisos de storage y logs
echo "🔐 Configurando permisos de storage y logs..."

# Crear todos los directorios necesarios
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache

# Detectar usuario del servidor web (para CyberPanel/LiteSpeed)
WEB_USER="apihe9688"
if id "$WEB_USER" >/dev/null 2>&1; then
    echo "   Usuario detectado: $WEB_USER"
else
    # Intentar detectar desde procesos PHP-FPM pool
    PHP_FPM_USER=$(ps aux | grep 'php-fpm: pool' | grep -v grep | head -1 | awk '{print $1}' | grep -v root)
    if [ ! -z "$PHP_FPM_USER" ]; then
        WEB_USER="$PHP_FPM_USER"
        echo "   Usuario PHP-FPM detectado: $WEB_USER"
    else
        WEB_USER="www-data"
        echo "   Usando usuario por defecto: $WEB_USER"
    fi
fi

# Eliminar archivo de log existente si tiene permisos incorrectos (se recreará con permisos correctos)
if [ -f storage/logs/laravel.log ]; then
    rm -f storage/logs/laravel.log 2>/dev/null || sudo rm -f storage/logs/laravel.log 2>/dev/null || true
fi

# Configurar permisos
chmod -R 775 storage 2>/dev/null || sudo chmod -R 775 storage || {
    echo "   ⚠️  Error al configurar permisos de storage, intentando con sudo..."
    sudo chmod -R 775 storage || echo "   ❌ No se pudieron configurar permisos de storage"
}

chmod -R 775 bootstrap/cache 2>/dev/null || sudo chmod -R 775 bootstrap/cache || {
    echo "   ⚠️  Error al configurar permisos de bootstrap/cache, intentando con sudo..."
    sudo chmod -R 775 bootstrap/cache || echo "   ❌ No se pudieron configurar permisos de bootstrap/cache"
}

# Para CyberPanel, usar permisos más permisivos en storage/logs (777 para directorio, 666 para archivo)
chmod -R 777 storage/logs 2>/dev/null || sudo chmod -R 777 storage/logs || {
    echo "   ⚠️  Error al configurar permisos de storage/logs, intentando con sudo..."
    sudo chmod -R 777 storage/logs || echo "   ❌ No se pudieron configurar permisos de storage/logs"
}

# Crear archivo de log con permisos correctos
touch storage/logs/laravel.log 2>/dev/null || sudo touch storage/logs/laravel.log || {
    echo "   ⚠️  Error al crear archivo de log, intentando con sudo..."
    sudo touch storage/logs/laravel.log || echo "   ❌ No se pudo crear el archivo de log"
}

# Usar 666 para el archivo de log (necesario para CyberPanel)
chmod 666 storage/logs/laravel.log 2>/dev/null || sudo chmod 666 storage/logs/laravel.log || true

# Configurar ownership
chown -R $WEB_USER:$WEB_USER storage 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de storage, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER storage || echo "   ❌ No se pudo configurar ownership de storage"
}

chown -R $WEB_USER:$WEB_USER bootstrap/cache 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de bootstrap/cache, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache || echo "   ❌ No se pudo configurar ownership de bootstrap/cache"
}

chown -R $WEB_USER:$WEB_USER storage/logs 2>/dev/null || sudo chown -R $WEB_USER:$WEB_USER storage/logs 2>/dev/null || {
    echo "   ⚠️  Error al configurar ownership de storage/logs, intentando con sudo..."
    sudo chown -R $WEB_USER:$WEB_USER storage/logs || echo "   ❌ No se pudo configurar ownership de storage/logs"
}

# Asegurar que el archivo de log tiene el ownership correcto
chown $WEB_USER:$WEB_USER storage/logs/laravel.log 2>/dev/null || sudo chown $WEB_USER:$WEB_USER storage/logs/laravel.log 2>/dev/null || true

echo "   ✅ Permisos de storage configurados"

# Optimizar para producción
echo "⚡ Optimizando para producción..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Deployment del backend completado exitosamente!"
echo "🌐 API: https://api.hela-ditos.com.ar"
EOFSCRIPT

chmod +x ~/deploy-backend-heladitos.sh

cat > ~/deploy-frontend-heladitos.sh << 'EOFSCRIPT'
#!/bin/bash
set -euo pipefail

# Script de deployment para el frontend React (build remoto en VPS) - Hela Ditos
# Requiere: NVM instalado, Node 20 disponible, repo monorepo en /home/api.hela-ditos.com.ar/public_html

echo "🚀 Iniciando deployment del frontend (build remoto) - HELA DITOS..."

# Cargar NVM y usar Node.js 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
echo "🟢 Node $(node -v) / npm $(npm -v)"

# Directorios
REPO_DIR="/home/api.hela-ditos.com.ar/public_html"
FRONTEND_SRC="$REPO_DIR/apps/frontend"
PUBLIC_DIR="/home/hela-ditos.com.ar/public_html"

echo "📥 Obteniendo últimos cambios del repositorio..."
cd "$REPO_DIR"

# Arreglar permisos antes de hacer git operations
echo "🔧 Arreglando permisos de archivos..."
# Hacer los archivos escritibles para poder actualizarlos
find . -type f -exec chmod 664 {} \; 2>/dev/null || true
find . -type d -exec chmod 775 {} \; 2>/dev/null || true

# Intentar obtener cambios
git fetch origin master

# Forzar actualización del código (descartar cambios locales si hay conflictos)
# Si falla por permisos, intentar con chown
if ! git reset --hard origin/master 2>/dev/null; then
    echo "⚠️  Reset falló, arreglando ownership y reintentando..."
    # Determinar el usuario y grupo correctos
    CURRENT_USER=$(whoami)
    # Intentar con sudo si está disponible
    if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
        sudo chown -R "$CURRENT_USER:$CURRENT_USER" . 2>/dev/null || true
    else
        # Intentar sin sudo
        chown -R "$CURRENT_USER:$CURRENT_USER" . 2>/dev/null || true
    fi
    # Reintentar reset
    git reset --hard origin/master || {
        echo "❌ No se pudo hacer reset. Intentando limpiar archivos problemáticos..."
        # Eliminar archivos .gitignore problemáticos manualmente
        find apps/backend/storage -name ".gitignore" -type f -delete 2>/dev/null || true
        git reset --hard origin/master
    }
fi

if [ ! -d "$FRONTEND_SRC" ]; then
	echo "❌ No existe el directorio frontend esperado: $FRONTEND_SRC" >&2
	exit 1
fi

BUILD_TMP="/tmp/frontend-build-src-$$"
ARTIFACT_TMP="/tmp/frontend-dist-$$"
cleanup() { rm -rf "$BUILD_TMP" "$ARTIFACT_TMP"; }
trap cleanup EXIT INT TERM

echo "🗂  Preparando copia aislada de código en $BUILD_TMP ..."
mkdir -p "$BUILD_TMP"
if command -v rsync >/dev/null 2>&1; then
	rsync -a --delete --exclude node_modules --exclude dist --exclude .git "$FRONTEND_SRC/" "$BUILD_TMP/"
else
	cp -R "$FRONTEND_SRC/"* "$BUILD_TMP/" || true
fi

cd "$BUILD_TMP"
echo "🧹 Limpiando rastros previos..."
rm -rf node_modules package-lock.json dist .npmrc 2>/dev/null || true

echo "📦 Instalando dependencias (modo aislado)..."
if ! npm install --no-audit --no-fund; then
	echo "⚠️ Primer intento de instalación falló. Reintentando tras limpieza..."
	rm -rf node_modules package-lock.json
	npm cache verify || true
	if ! npm install --no-audit --no-fund; then
		echo "❌ Falló la instalación de dependencias (segundo intento)." >&2
		exit 1
	fi
fi

echo "🔨 Construyendo proyecto para producción (vite build)..."
# Usar VITE_API_URL de .env si existe, sino usar el valor por defecto
export VITE_API_URL="${VITE_API_URL:-https://api.hela-ditos.com.ar}"
if ! npm run build; then
	echo "❌ Build falló. Abortando deployment." >&2
	exit 1
fi

if [ ! -d dist ]; then
	echo "❌ No se generó dist/. Abortando." >&2
	exit 1
fi

echo "📦 Tamaño de artefactos:" && du -sh dist || true

echo "📂 Publicando artefactos en $PUBLIC_DIR ..."
rm -rf "${PUBLIC_DIR:?}"/*
cp -r dist/* "$PUBLIC_DIR/"

# Configurar permisos correctos para el usuario de CyberPanel
WEB_USER="helad9981"
if id "$WEB_USER" >/dev/null 2>&1; then
    echo "🔐 Configurando permisos para usuario: $WEB_USER"
    chown -R "$WEB_USER:$WEB_USER" "$PUBLIC_DIR" 2>/dev/null || sudo chown -R "$WEB_USER:$WEB_USER" "$PUBLIC_DIR" 2>/dev/null || true
    find "$PUBLIC_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || sudo find "$PUBLIC_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$PUBLIC_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || sudo find "$PUBLIC_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
else
    echo "⚠️  Usuario $WEB_USER no encontrado, usando permisos por defecto"
    find "$PUBLIC_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$PUBLIC_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
fi

echo "✅ Deployment del frontend completado exitosamente!"
echo "🌐 URL: https://hela-ditos.com.ar"
EOFSCRIPT

chmod +x ~/deploy-frontend-heladitos.sh

echo "✅ Scripts creados y configurados correctamente"
```

### 2. Verificar que los Scripts Están Creados

```bash
# Verificar que existen
ls -lah ~/deploy-*-heladitos.sh

# Deberías ver:
# -rwxr-xr-x 1 root root ... ~/deploy-backend-heladitos.sh
# -rwxr-xr-x 1 root root ... ~/deploy-frontend-heladitos.sh
```

### 3. Probar los Scripts Manualmente (Opcional)

```bash
# Probar backend
~/deploy-backend-heladitos.sh

# Probar frontend
~/deploy-frontend-heladitos.sh
```

## 🚀 Uso

Una vez configurados los scripts, el workflow de GitHub Actions los ejecutará automáticamente cuando hagas push a `master`.

También puedes ejecutarlos manualmente desde el VPS cuando lo necesites.

## 📝 Notas

- Los scripts están adaptados para los paths de Hela Ditos
- Detectan automáticamente el usuario correcto de CyberPanel
- Manejan permisos de forma segura
- El frontend se build en el VPS (igual que Heroe del Whisky)

