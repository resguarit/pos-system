#!/bin/bash

# Script de configuración del Sistema de Configuración del Sistema
# Ejecuta todos los pasos necesarios para implementar el sistema de configuración

set -e  # Exit on error

echo "🚀 Configurando Sistema de Configuración del Sistema..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "apps/backend" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Cambiar al directorio del backend
cd apps/backend

# 1. Ejecutar migraciones
echo ""
print_info "Ejecutando migraciones..."
if php artisan migrate --force; then
    print_success "Migraciones ejecutadas correctamente"
else
    print_warning "Algunas migraciones ya estaban ejecutadas o hubo un error"
fi

# 2. Ejecutar seeders de permisos
echo ""
print_info "Ejecutando seeders de permisos..."
if php artisan db:seed --class=PermissionSeeder; then
    print_success "Permisos actualizados correctamente"
else
    print_error "Error al ejecutar PermissionSeeder"
    exit 1
fi

# 3. Crear link simbólico de storage
echo ""
print_info "Creando link simbólico de storage..."
if [ ! -L public/storage ]; then
    php artisan storage:link
    print_success "Link de storage creado correctamente"
else
    print_warning "Link de storage ya existe"
fi

# 4. Verificar y crear directorios necesarios
echo ""
print_info "Verificando directorios de storage..."
mkdir -p storage/app/public/system/logos
mkdir -p storage/app/public/system/favicons
print_success "Directorios de storage verificados"

# 5. Asegurar permisos correctos
echo ""
print_info "Configurando permisos de archivos..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache
print_success "Permisos configurados correctamente"

# 6. Limpiar cache
echo ""
print_info "Limpiando cache..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
print_success "Cache limpiado correctamente"

# 7. Verificar configuración
echo ""
print_info "Verificando configuración..."

# Verificar que el modelo Setting existe
if php artisan tinker --execute="echo App\Models\Setting::count();" > /dev/null 2>&1; then
    print_success "Modelo Setting encontrado"
else
    print_warning "No se pudo verificar el modelo Setting"
fi

# Volver al directorio raíz
cd ../..

echo ""
print_success "✨ Configuración completada exitosamente!"
echo ""
echo "Próximos pasos:"
echo "1. Asigna los permisos 'ver_configuracion_sistema' y 'editar_configuracion_sistema' a los roles necesarios"
echo "2. Navega a /dashboard/configuracion-sistema para configurar el sistema"
echo "3. Sube logo y favicon (opcional)"
echo "4. Configura los datos de tu empresa"
echo ""
echo "Para más información, consulta: SYSTEM_CONFIG_IMPLEMENTATION.md"

