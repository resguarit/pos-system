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

# Limpiar locks de Git si existen
if [ -f .git/HEAD.lock ]; then
    echo "🧹 Eliminando lock file de Git..."
    rm -f .git/HEAD.lock .git/refs/heads/master.lock 2>/dev/null || true
fi

# Configurar SSH para evitar pedir passphrase
if [ -n "$SSH_AUTH_SOCK" ]; then
    echo "🔑 Usando ssh-agent existente..."
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "🔑 Iniciando ssh-agent para clave SSH..."
    eval "$(ssh-agent -s)" >/dev/null 2>&1
    ssh-add ~/.ssh/id_ed25519 </dev/null 2>/dev/null || true
fi

# Arreglar permisos antes de hacer git operations
echo "🔧 Arreglando permisos de archivos..."
# Hacer los archivos escritibles para poder actualizarlos
find . -type f -exec chmod 664 {} \; 2>/dev/null || true
find . -type d -exec chmod 775 {} \; 2>/dev/null || true

# Configurar Git para usar SSH siempre
git config --global url."git@github.com:".insteadOf "https://github.com/" 2>/dev/null || true

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
    # Limpiar locks nuevamente
    rm -f .git/HEAD.lock .git/refs/heads/master.lock 2>/dev/null || true
    # Reintentar reset
    git reset --hard origin/master || {
        echo "❌ No se pudo hacer reset. Intentando limpiar archivos problemáticos..."
        # Eliminar archivos .gitignore problemáticos manualmente
        find apps/backend/storage -name ".gitignore" -type f -delete 2>/dev/null || true
        rm -f .git/HEAD.lock .git/refs/heads/master.lock 2>/dev/null || true
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
# IMPORTANTE: Debe incluir /api al final porque Laravel usa prefijo /api para rutas API
export VITE_API_URL="${VITE_API_URL:-https://api.hela-ditos.com.ar/api}"
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

