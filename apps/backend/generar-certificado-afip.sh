#!/bin/bash

# ============================================
# Script para Generar Certificado AFIP
# Basado en documentación oficial AFIP/ARCA
# ============================================

echo "======================================"
echo "GENERACIÓN DE CERTIFICADO AFIP"
echo "======================================"
echo ""

# Configuración
CUIT="30718708997"
NOMBRE_EMPRESA="RESGUAR IT Consultoría en informática y Tecnología S.R.L."
DIAS_VALIDEZ=730  # 2 años (máximo permitido por AFIP)

# Nombres de archivos
KEY_FILE="clave_privada_${CUIT}.key"
CSR_FILE="certificado_${CUIT}.csr"

echo "CUIT: $CUIT"
echo "Nombre: $NOMBRE_EMPRESA"
echo "Validez: $DIAS_VALIDEZ días"
echo ""

# Paso 1: Generar clave privada (2048 bits mínimo según AFIP)
echo "Paso 1: Generando clave privada..."
openssl genrsa -out "$KEY_FILE" 2048

if [ $? -eq 0 ]; then
    echo "✅ Clave privada generada: $KEY_FILE"
else
    echo "❌ Error al generar clave privada"
    exit 1
fi

echo ""

# Paso 2: Generar CSR (Certificate Signing Request)
echo "Paso 2: Generando CSR..."
echo ""
echo "IMPORTANTE: Cuando te pida información, ingresá:"
echo "  - Country Name (C): AR"
echo "  - Organization Name (O): $NOMBRE_EMPRESA"
echo "  - Common Name (CN): $NOMBRE_EMPRESA"
echo "  - Otros campos: podés dejarlos vacíos (presionar Enter)"
echo ""

openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" \
    -subj "/C=AR/O=$NOMBRE_EMPRESA/CN=$NOMBRE_EMPRESA/serialNumber=CUIT $CUIT"

if [ $? -eq 0 ]; then
    echo "✅ CSR generado: $CSR_FILE"
else
    echo "❌ Error al generar CSR"
    exit 1
fi

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
echo "PRÓXIMOS PASOS"
echo "======================================"
echo ""
echo "1. Ir a ARCA: https://www.afip.gob.ar/arqa/"
echo "2. Seleccionar ambiente: PRODUCCIÓN"
echo "3. Ir a 'Certificados' → 'Generar Certificado'"
echo "4. Subir el archivo: $CSR_FILE"
echo "5. Descargar el certificado .crt que te da ARCA"
echo "6. Copiar ambos archivos a storage/certificates/"
echo ""
echo "Comandos para copiar:"
echo "  cp $KEY_FILE storage/certificates/clave_privada.key"
echo "  cp certificado_descargado.crt storage/certificates/certificado.crt"
echo "  chmod 600 storage/certificates/clave_privada.key"
echo "  chmod 644 storage/certificates/certificado.crt"
echo ""
