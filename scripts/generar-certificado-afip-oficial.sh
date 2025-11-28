#!/bin/bash

# ============================================
# Script para Generar Certificado AFIP
# Según Documentación Oficial AFIP/ARCA
# ============================================

echo "======================================"
echo "GENERACIÓN DE CERTIFICADO AFIP OFICIAL"
echo "======================================"
echo ""

# Configuración
CUIT="30718708997"
# Usar nombre corto para el certificado (según doc oficial)
NOMBRE_EMPRESA="RESGUAR IT"

# Nombres de archivos
KEY_FILE="clave_privada.key"
CSR_FILE="certificado.csr"

echo "CUIT: $CUIT"
echo "Organización: $NOMBRE_EMPRESA"
echo ""

# Paso 1: Generar clave privada (2048 bits según AFIP)
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Ya existe clave privada: $KEY_FILE"
    read -p "¿Desea generar una nueva? (s/n): " respuesta
    if [ "$respuesta" != "s" ]; then
        echo "Usando clave privada existente"
    else
        rm -f "$KEY_FILE"
        echo "Generando nueva clave privada..."
        openssl genrsa -out "$KEY_FILE" 2048
        if [ $? -eq 0 ]; then
            echo "✅ Clave privada generada: $KEY_FILE"
        else
            echo "❌ Error al generar clave privada"
            exit 1
        fi
    fi
else
    echo "Paso 1: Generando clave privada..."
    openssl genrsa -out "$KEY_FILE" 2048
    if [ $? -eq 0 ]; then
        echo "✅ Clave privada generada: $KEY_FILE"
    else
        echo "❌ Error al generar clave privada"
        exit 1
    fi
fi

echo ""

# Paso 2: Generar CSR con formato OFICIAL de AFIP
# IMPORTANTE: serialNumber debe ser "CUIT XXXXXXXX" (con espacio)
echo "Paso 2: Generando CSR con formato oficial AFIP..."

openssl req -new -key "$KEY_FILE" \
    -subj "/C=AR/O=${NOMBRE_EMPRESA}/CN=${NOMBRE_EMPRESA}/serialNumber=CUIT ${CUIT}" \
    -out "$CSR_FILE"

if [ $? -eq 0 ]; then
    echo "✅ CSR generado: $CSR_FILE"
else
    echo "❌ Error al generar CSR"
    exit 1
fi

echo ""
echo "======================================"
echo "VERIFICACIÓN DEL CSR"
echo "======================================"
echo ""

# Verificar que el CSR se generó correctamente
echo "Contenido del Subject del CSR:"
openssl req -in "$CSR_FILE" -text -noout | grep "Subject:"

echo ""
echo "Verificación de serialNumber:"
openssl req -in "$CSR_FILE" -text -noout | grep "serialNumber"

echo ""
echo "======================================"
echo "✅ ARCHIVOS GENERADOS"
echo "======================================"
echo ""
echo "1. $KEY_FILE (CLAVE PRIVADA)"
echo "   ⚠️  NUNCA compartas este archivo"
echo "   ⚠️  NUNCA lo subas a Git"
echo "   ⚠️  Guardalo en lugar seguro"
echo ""
echo "2. $CSR_FILE (Certificate Signing Request)"
echo "   → Este archivo SÍ lo vas a subir a ARCA"
echo ""
echo "======================================"
echo "PRÓXIMOS PASOS SEGÚN AFIP OFICIAL"
echo "======================================"
echo ""
echo "1. Ir a ARCA: https://www.afip.gob.ar/arqa/"
echo "2. Ingresar con CUIT: $CUIT"
echo "3. Ir a: Administración de Certificados Digitales"
echo "4. Crear un Alias (si no existe): 'wsfe-produccion'"
echo "5. Ir a: Generar Certificado"
echo "6. Completar:"
echo "   - Ambiente: PRODUCCIÓN ⚠️"
echo "   - Alias: wsfe-produccion"
echo "   - Servicio: wsfe"
echo "   - Archivo CSR: $CSR_FILE"
echo "7. Descargar el certificado .crt generado por ARCA"
echo ""
echo "======================================"
echo "COMANDOS PARA DESPUÉS"
echo "======================================"
echo ""
echo "Una vez descargado el .crt de ARCA:"
echo ""
echo "  # Copiar archivos a storage/certificates"
echo "  cp $KEY_FILE storage/certificates/clave_privada.key"
echo "  cp certificado_descargado.crt storage/certificates/certificado.crt"
echo ""
echo "  # Ajustar permisos"
echo "  chmod 600 storage/certificates/clave_privada.key"
echo "  chmod 644 storage/certificates/certificado.crt"
echo ""
echo "  # Verificar que coincidan"
echo "  openssl x509 -noout -modulus -in storage/certificates/certificado.crt | openssl md5"
echo "  openssl rsa -noout -modulus -in storage/certificates/clave_privada.key | openssl md5"
echo ""
