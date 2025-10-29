#!/bin/bash
set -euo pipefail

# Script de deployment para el frontend React (build remoto en VPS)
# Requiere: NVM instalado, Node 20 disponible, repo monorepo en /home/api.heroedelwhisky.com.ar/public_html

echo "🚀 Iniciando deployment del frontend (build remoto)..."

# Cargar NVM y usar Node.js 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
echo "🟢 Node $(node -v) / npm $(npm -v)"

# Directorios
REPO_DIR="/home/api.heroedelwhisky.com.ar/public_html"
FRONTEND_SRC="$REPO_DIR/apps/frontend"
PUBLIC_DIR="/home/heroedelwhisky.com.ar/public_html"

echo "📥 Obteniendo últimos cambios del repositorio..."
cd "$REPO_DIR"
git fetch origin master

# Arreglar permisos antes de hacer reset
echo "🔧 Arreglando permisos de archivos..."
find . -type f -name ".gitignore" -exec chmod 664 {} \; 2>/dev/null || true
find . -type d -exec chmod 775 {} \; 2>/dev/null || true

# Intentar reset, si falla por permisos, arreglar y reintentar
if ! git reset --hard origin/master 2>/dev/null; then
    echo "⚠️  Reset falló, arreglando permisos y reintentando..."
    # Usar sudo si está disponible, o chown/chmod según el usuario
    sudo chown -R "$USER:$USER" . 2>/dev/null || chown -R "$USER:$USER" . 2>/dev/null || true
    find . -type f -exec chmod 664 {} \; 2>/dev/null || true
    find . -type d -exec chmod 775 {} \; 2>/dev/null || true
    git reset --hard origin/master
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

echo "✅ Deployment del frontend completado exitosamente!"
echo "🌐 URL: https://heroedelwhisky.com.ar"