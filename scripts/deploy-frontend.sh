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

# Directorio raíz del repo
REPO_DIR="/home/api.heroedelwhisky.com.ar/public_html"
FRONTEND_DIR="$REPO_DIR/apps/frontend"
PUBLIC_DIR="/home/heroedelwhisky.com.ar/public_html"

cd "$REPO_DIR"
echo "📥 Obteniendo últimos cambios del repositorio..."
git fetch origin master
git reset --hard origin/master

# Limpiar sólo dependencias del frontend para asegurar reinstalación de binarios opcionales
echo "🧹 Limpiando instalación previa (frontend)..."
rm -rf "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/package-lock.json"

# Instalar dependencias a nivel monorepo (workspaces) para que npm resuelva correctamente binarios opcionales
echo "📦 Instalando dependencias (workspaces)..."
npm install --workspaces --include-workspace-root

cd "$FRONTEND_DIR"

# Instalar/forzar binarios nativos críticos (rollup, swc, lightningcss)
echo "🔧 Verificando binarios nativos (rollup, swc, lightningcss)..."
npm install --no-save @rollup/rollup-linux-x64-gnu || true
npm install --no-save @swc/core-linux-x64-gnu || true
npm install --no-save lightningcss lightningcss-linux-x64-gnu || true

# Diagnóstico rápido si siguen faltando
echo "🔍 Comprobando presencia de paquetes nativos..."
ls -1 node_modules/@rollup 2>/dev/null || echo "(warn) @rollup no presente"
ls -1 node_modules/@swc 2>/dev/null || echo "(warn) @swc no presente"
ls -1 node_modules/lightningcss 2>/dev/null || echo "(warn) lightningcss no presente"

# Construir el proyecto para producción
echo "🔨 Construyendo proyecto para producción..."
if ! npm run build; then
	echo "❌ Build falló. Abortando deployment." >&2
	exit 1
fi

if [ ! -d "dist" ]; then
	echo "❌ Build completó sin errores pero falta el directorio dist/. Abortando." >&2
	exit 1
fi

echo "📦 Tamaño de artefactos generados:" 
du -sh dist || true

# Publicar
echo "📂 Publicando artefactos..."
rm -rf "${PUBLIC_DIR:?}"/*
cp -r dist/* "$PUBLIC_DIR/"

echo "✅ Deployment del frontend completado exitosamente!"
echo "🌐 URL: https://heroedelwhisky.com.ar"