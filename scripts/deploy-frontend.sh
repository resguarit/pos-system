#!/bin/bash

# Script de deployment para el frontend React
# Este script se ejecuta en el servidor VPS

echo "🚀 Iniciando deployment del frontend..."

# Cargar NVM y usar Node.js 18
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18

# Cambiar al directorio del proyecto
cd /home/api.heroedelwhisky.com.ar/public_html

# Hacer pull de los últimos cambios
echo "📥 Obteniendo últimos cambios del repositorio..."
git pull origin master

# Cambiar al directorio del frontend
cd apps/frontend

# Limpiar instalaciones previas (bug de npm con dependencias opcionales)
echo "🧹 Limpiando instalación previa..."
rm -rf node_modules package-lock.json

# Instalar/actualizar dependencias de npm
echo "📦 Instalando dependencias de npm..."
npm install --force

# Construir el proyecto para producción
echo "🔨 Construyendo proyecto para producción..."
npm run build

# Copiar los archivos build al directorio público del dominio frontend
echo "📂 Copiando archivos al directorio público..."
# Ajusta esta ruta según donde esté configurado tu dominio frontend
rm -rf /home/heroedelwhisky.com.ar/public_html/*
cp -r dist/* /home/heroedelwhisky.com.ar/public_html/

echo "✅ Deployment del frontend completado exitosamente!"