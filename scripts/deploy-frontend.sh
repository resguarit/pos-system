#!/bin/bash

# Script de deployment para el frontend React
# Este script se ejecuta en el servidor VPS

echo "🚀 Iniciando deployment del frontend..."

# Cambiar al directorio del proyecto
cd /home/api.heroedelwhisky.com.ar/public_html

# Hacer pull de los últimos cambios
echo "📥 Obteniendo últimos cambios del repositorio..."
git pull origin master

# Cambiar al directorio del frontend
cd apps/frontend

# Instalar/actualizar dependencias de npm
echo "📦 Instalando dependencias de npm..."
npm ci

# Construir el proyecto para producción
echo "🔨 Construyendo proyecto para producción..."
npm run build

# Copiar los archivos build al directorio público del dominio frontend
echo "📂 Copiando archivos al directorio público..."
# Ajusta esta ruta según donde esté configurado tu dominio frontend
# rm -rf /home/heroedelwhisky.com.ar/public_html/*
# cp -r dist/* /home/heroedelwhisky.com.ar/public_html/

echo "✅ Deployment del frontend completado exitosamente!"