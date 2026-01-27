#!/bin/bash
# =============================================================================
# Deploy backend de todos los clientes en el VPS (directorio /home, api.*).
# Uso:
#   ./deploy-all-clients-server.sh
# Actualizar script desde el repo y ejecutar:
#   curl -sfL "https://raw.githubusercontent.com/resguarit/pos-system/master/scripts/deploy-all-clients-server.sh" -o /tmp/deploy-all-clients-server.sh
#   chmod +x /tmp/deploy-all-clients-server.sh
#   /tmp/deploy-all-clients-server.sh
# =============================================================================

set -e

readonly HOME_DIR="/home"
readonly SCRIPT_NAME="${0##*/}"

# -----------------------------------------------------------------------------
# Descubre la ruta del backend Laravel dentro de un directorio api.*
# Uso: discover_backend_path "/home/api.ejemplo.com.ar"
# Devuelve la ruta al directorio con artisan o vacío si no hay.
# -----------------------------------------------------------------------------
discover_backend_path() {
  local api_dir="$1"
  if [[ -d "${api_dir}/public_html/apps/backend" && -f "${api_dir}/public_html/apps/backend/artisan" ]]; then
    echo "${api_dir}/public_html/apps/backend"
  elif [[ -d "${api_dir}/public_html" && -f "${api_dir}/public_html/artisan" ]]; then
    echo "${api_dir}/public_html"
  elif [[ -f "${api_dir}/artisan" ]]; then
    echo "${api_dir}"
  else
    echo ""
  fi
}

# -----------------------------------------------------------------------------
# Ejecuta el deploy en un solo backend (pull, composer, migrate, permisos, cache).
# Exit: 0 si todo bien, 1 si falló migración o composer.
# -----------------------------------------------------------------------------
deploy_one_client() {
  local backend_path="$1"
  local client_name="$2"

  if [[ ! -f "${backend_path}/artisan" ]]; then
    return 1
  fi

  (
    cd "${backend_path}" || return 1

    # Git
    if ! git pull origin master 2>/dev/null; then
      echo "⚠️  Git pull failed or not a git repository"
    fi

    # Composer
    if ! command -v composer &>/dev/null; then
      echo "⚠️  Composer not found"
      return 1
    fi
    if ! COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --no-interaction --optimize-autoloader --ignore-platform-req=ext-soap; then
      echo "❌ Composer install failed"
      return 1
    fi

    # Migraciones
    if ! php artisan migrate --force; then
      echo "❌ Migrations failed"
      return 1
    fi

    # Permisos y caches (mejor esfuerzo)
    php artisan admin:grant-all-permissions --force 2>/dev/null || true
    php artisan config:clear 2>/dev/null || true
    php artisan cache:clear 2>/dev/null || true
    php artisan route:clear 2>/dev/null || true
    php artisan view:clear 2>/dev/null || true

    return 0
  )
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
  echo "🚀 ${SCRIPT_NAME}: deploying backends under ${HOME_DIR}"
  echo ""

  cd "${HOME_DIR}" || { echo "❌ Cannot cd to ${HOME_DIR}"; exit 1; }

  local api_dirs
  api_dirs=$(ls -d api.* 2>/dev/null || true)
  if [[ -z "${api_dirs}" ]]; then
    echo "❌ No api.* directories found in ${HOME_DIR}"
    exit 1
  fi

  declare -a success_clients=()
  declare -a failed_clients=()
  local total=0
  local ok=0

  for api_dir in ${api_dirs}; do
    [[ -d "${api_dir}" ]] || continue

    total=$((total + 1))
    local client_name="${api_dir#api.}"
    client_name="${client_name%.com.ar}"
    client_name="${client_name%.net.ar}"

    local backend_path
    backend_path=$(discover_backend_path "${HOME_DIR}/${api_dir}")

    if [[ -z "${backend_path}" || ! -f "${backend_path}/artisan" ]]; then
      echo "⚠️  Skipping ${client_name}: no Laravel app in ${api_dir}"
      failed_clients+=("${client_name} (app not found)")
      continue
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 ${client_name} → ${backend_path}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if deploy_one_client "${backend_path}" "${client_name}"; then
      echo "✅ ${client_name} OK"
      success_clients+=("${client_name}")
      ok=$((ok + 1))
    else
      echo "❌ ${client_name} FAILED"
      failed_clients+=("${client_name} (deploy error)")
    fi
    echo ""
  done

  # Resumen
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Summary: ${ok}/${total} ok"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  [[ ${#success_clients[@]} -gt 0 ]] && printf '  ✅ %s\n' "${success_clients[@]}"
  [[ ${#failed_clients[@]} -gt 0 ]] && { printf '  ❌ %s\n' "${failed_clients[@]}"; exit 1; }
  exit 0
}

main "$@"
