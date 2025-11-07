#!/bin/bash

# Script de Deployment - Simplificación Cuentas Corrientes
# Elimina funcionalidad de crédito a favor y simplifica el sistema

set -e  # Salir si hay algún error

echo "=========================================="
echo "Deployment - Simplificación Cuentas Corrientes"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "apps/backend" ]; then
    print_error "No se encuentra el directorio apps/backend. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

print_info "Iniciando proceso de deployment..."

# 1. Backup de base de datos
print_info "Paso 1: Crear backup de base de datos..."
read -p "¿Deseas crear un backup de la base de datos? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    BACKUP_FILE="backup_pre_simplificacion_$(date +%Y%m%d_%H%M%S).sql"
    print_info "Creando backup en: $BACKUP_FILE"
    # Ajustar según tu configuración de base de datos
    read -p "Usuario de MySQL: " DB_USER
    read -sp "Contraseña de MySQL: " DB_PASS
    echo
    read -p "Nombre de la base de datos: " DB_NAME
    
    mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_info "Backup creado exitosamente: $BACKUP_FILE"
    else
        print_error "Error al crear backup. ¿Deseas continuar? (s/n): "
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Saltando backup. Asegúrate de tener un backup reciente."
fi

# 2. Instalar dependencias backend
print_info "Paso 2: Instalando dependencias del backend..."
cd apps/backend
composer install --no-dev --optimize-autoloader

if [ $? -ne 0 ]; then
    print_error "Error al instalar dependencias del backend"
    exit 1
fi

# 3. Ejecutar migraciones
print_info "Paso 3: Ejecutando migraciones..."
print_warning "Esta migración eliminará la columna 'accumulated_credit' de la tabla 'current_accounts'"
read -p "¿Deseas continuar con las migraciones? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    php artisan migrate
    
    if [ $? -ne 0 ]; then
        print_error "Error al ejecutar migraciones"
        exit 1
    fi
    print_info "Migraciones ejecutadas exitosamente"
else
    print_warning "Migraciones canceladas por el usuario"
fi

# 4. Limpiar y optimizar caché
print_info "Paso 4: Limpiando y optimizando caché..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

print_info "Caché optimizada"

# 5. Frontend (si es necesario)
cd ../..
if [ -d "apps/frontend" ]; then
    print_info "Paso 5: Procesando frontend..."
    cd apps/frontend
    
    if [ -f "package.json" ]; then
        print_info "Instalando dependencias del frontend..."
        npm install
        
        print_info "Compilando frontend..."
        npm run build
        
        if [ $? -ne 0 ]; then
            print_error "Error al compilar el frontend"
            exit 1
        fi
        print_info "Frontend compilado exitosamente"
    else
        print_warning "No se encontró package.json en frontend"
    fi
    cd ../..
fi

# 6. Verificación final
print_info "Paso 6: Verificando instalación..."
cd apps/backend

# Verificar que la migración se aplicó correctamente
php artisan tinker --execute="echo Schema::hasColumn('current_accounts', 'accumulated_credit') ? 'ERROR: La columna accumulated_credit aún existe' : 'OK: La columna accumulated_credit fue eliminada';"

echo ""
print_info "=========================================="
print_info "Deployment completado exitosamente!"
print_info "=========================================="
echo ""
print_warning "IMPORTANTE: Verifica manualmente que:"
echo "  1. La lista de cuentas corrientes carga correctamente"
echo "  2. No aparece la columna 'Crédito disponible'"
echo "  3. El registro de pagos funciona correctamente"
echo "  4. No permite seleccionar ventas de distintas sucursales"
echo ""

