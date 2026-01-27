#!/bin/bash

# ============================================
# Script Interactivo de Configuración AFIP
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   ASISTENTE DE CONFIGURACIÓN AFIP (PRODUCCIÓN)   ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""
echo "Este script te ayudará a generar los certificados necesarios para facturar."
echo ""

# 1. Solicitar Datos
echo -e "${YELLOW}PASO 1: Ingresa los datos de tu empresa${NC}"
read -p "CUIT (sin guiones): " CUIT
read -p "Nombre de la Empresa (Razón Social): " COMPANY_NAME
read -p "Alias para el certificado (ej: sistema-web): " ALIAS

if [ -z "$CUIT" ] || [ -z "$COMPANY_NAME" ] || [ -z "$ALIAS" ]; then
    echo -e "${RED}Error: Todos los campos son obligatorios.${NC}"
    exit 1
fi

# 2. Preparar Directorios
CERT_DIR="storage/certificates/${CUIT}"
mkdir -p "$CERT_DIR"
chmod 700 "$CERT_DIR"

KEY_FILE="${CERT_DIR}/private.key"
CSR_FILE="${CERT_DIR}/certificate.csr"

echo ""
echo -e "${YELLOW}PASO 2: Generando Clave Privada y CSR${NC}"

# 3. Generar Clave Privada
if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠️  Ya existe una clave privada para este CUIT.${NC}"
    read -p "¿Desea sobrescribirla? ESTO INVALIDARÁ EL CERTIFICADO ANTERIOR (s/n): " OVERWRITE
    if [ "$OVERWRITE" != "s" ]; then
        echo "Operación cancelada."
        exit 0
    fi
fi

echo "Generando clave privada..."
openssl genrsa -out "$KEY_FILE" 2048
chmod 600 "$KEY_FILE"

# 4. Generar CSR
echo "Generando pedido de certificado (CSR)..."
openssl req -new -key "$KEY_FILE" \
    -subj "/C=AR/O=${COMPANY_NAME}/CN=${ALIAS}/serialNumber=CUIT ${CUIT}" \
    -out "$CSR_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos generados correctamente en: ${CERT_DIR}${NC}"
else
    echo -e "${RED}❌ Error al generar los archivos.${NC}"
    exit 1
fi

# 5. Instrucciones para el usuario
echo ""
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   ¡LISTO! AHORA SIGUE ESTOS PASOS EN LA WEB DE AFIP   ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""
echo "1. Ingresa a AFIP con Clave Fiscal."
echo "2. Ve al servicio 'Administración de Certificados Digitales'."
echo "3. Selecciona el alias '${ALIAS}' (o crea uno nuevo si no existe)."
echo "4. Haz clic en 'Agregar Certificado' o 'Subir CSR'."
echo "5. Sube este archivo que acabamos de generar: "
echo -e "   👉 ${GREEN}$(pwd)/${CSR_FILE}${NC}"
echo "6. Descarga el certificado firmado (.crt)."
echo "7. Guárdalo EXACTAMENTE en esta ubicación con el nombre 'certificate.crt':"
echo -e "   👉 ${YELLOW}$(pwd)/${CERT_DIR}/certificate.crt${NC}"
echo ""
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   CONFIGURACIÓN FINAL (Agrega esto a tu .env)   ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""
echo "AFIP_ENVIRONMENT=production"
echo "AFIP_CUIT=${CUIT}"
echo "AFIP_DEFAULT_POINT_OF_SALE=PointOfSaleNumber" # User needs to fill this
echo "AFIP_CERTIFICATES_BASE_PATH=storage/certificates"
echo ""
echo "Nota: Reemplaza 'PointOfSaleNumber' con el número de Punto de Venta 'RECE' que creaste en AFIP."
echo ""
