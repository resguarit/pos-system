#!/bin/bash

# Script de deployment del frontend (desde máquina local)
# Este script construye el frontend localmente y lo sube al VPS

echo "🚀 Iniciando deployment del frontend desde máquina local..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

# Cambiar al directorio del frontend
cd apps/frontend

# Construir el proyecto
echo "🔨 Construyendo proyecto para producción..."
npm run build

# Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
    echo "❌ Error: El build falló, no se encontró el directorio dist/"
    exit 1
fi

# Subir los archivos al VPS
echo "📤 Subiendo archivos al VPS..."
scp -P 5507 -r dist/* posdeployer@149.50.138.145:/tmp/frontend-build/

# Mover archivos a producción en el VPS
echo "📂 Desplegando archivos en producción..."
ssh -p 5507 posdeployer@149.50.138.145 'rm -rf /home/heroedelwhisky.com.ar/public_html/* && cp -r /tmp/frontend-build/* /home/heroedelwhisky.com.ar/public_html/'

echo "✅ Deployment del frontend completado exitosamente!"
echo "🌐 Sitio disponible en: https://heroedelwhisky.com.ar"
