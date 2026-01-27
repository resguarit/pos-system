#!/bin/bash

# Ejecuta traceability:seed en todas las APIs de clientes.
# Ejecutar desde /home en el VPS donde están las carpetas api.*
#
# Uso:
#   cd /home && ./seed-traceability-all-clients.sh
#   # o desde el repo:
#   ./scripts/seed-traceability-all-clients.sh
#
# Opciones:
#   BASE_DIR=/home  (por defecto si se ejecuta desde /home)
#   --dry-run      muestra qué directorios se procesarían sin ejecutar

set -e

DRY_RUN=false
BASE_DIR="${1:-/home}"

if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  BASE_DIR="/home"
fi

if [ -n "$1" ] && [ "$1" != "--dry-run" ]; then
  BASE_DIR="$1"
fi

echo "📦 Seed trazabilidad en todas las APIs de clientes"
echo "   BASE_DIR=$BASE_DIR"
echo ""

cd "$BASE_DIR" || { echo "❌ No se pudo entrar a $BASE_DIR"; exit 1; }

API_DIRS=$(ls -d api.* 2>/dev/null || true)

if [ -z "$API_DIRS" ]; then
  echo "❌ No se encontraron directorios api.* en $BASE_DIR"
  exit 1
fi

success_count=0
skip_count=0
fail_count=0

for api_dir in $API_DIRS; do
  [ ! -d "$api_dir" ] && continue

  BACKEND_PATH=""
  if [ -d "$api_dir/public_html/apps/backend" ] && [ -f "$api_dir/public_html/apps/backend/artisan" ]; then
    BACKEND_PATH="$BASE_DIR/$api_dir/public_html/apps/backend"
  elif [ -d "$api_dir/public_html" ] && [ -f "$api_dir/public_html/artisan" ]; then
    BACKEND_PATH="$BASE_DIR/$api_dir/public_html"
  elif [ -f "$api_dir/artisan" ]; then
    BACKEND_PATH="$BASE_DIR/$api_dir"
  fi

  if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH/artisan" ]; then
    echo "⚠️  Omitido (no hay Laravel): $api_dir"
    skip_count=$((skip_count + 1))
    continue
  fi

  client_name=$(echo "$api_dir" | sed 's/api\.//' | sed 's/\.com\.ar$//' | sed 's/\.net\.ar$//')

  if [ "$DRY_RUN" = true ]; then
    echo "   [dry-run] $client_name -> $BACKEND_PATH"
    success_count=$((success_count + 1))
    continue
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $client_name"
  echo "   $BACKEND_PATH"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if (cd "$BACKEND_PATH" && php artisan traceability:seed --force 2>&1); then
    echo "   ✅ OK"
    success_count=$((success_count + 1))
  else
    echo "   ❌ Error en $client_name"
    fail_count=$((fail_count + 1))
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Completado: $success_count | ⚠️ Omitidos: $skip_count | ❌ Errores: $fail_count"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ $fail_count -gt 0 ] && exit 1
exit 0
