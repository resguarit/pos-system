#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/fix-laravel-permissions.sh [web_user] [web_group]
# Example:
#   bash scripts/fix-laravel-permissions.sh www-data www-data

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_USER="${1:-www-data}"
WEB_GROUP="${2:-$WEB_USER}"

cd "$APP_DIR"

echo "Applying Laravel writable paths permissions in: $APP_DIR"
echo "Using owner: ${WEB_USER}:${WEB_GROUP}"

chown -R "${WEB_USER}:${WEB_GROUP}" storage bootstrap/cache

find storage bootstrap/cache -type d -exec chmod 775 {} \;
find storage bootstrap/cache -type f -exec chmod 664 {} \;

touch storage/logs/laravel.log
chown "${WEB_USER}:${WEB_GROUP}" storage/logs/laravel.log
chmod 664 storage/logs/laravel.log

echo "Verifying write access as ${WEB_USER}..."
sudo -u "${WEB_USER}" php -r "file_put_contents('storage/logs/laravel.log', date('c').\" permission-test\n\", FILE_APPEND); echo 'write-ok'.PHP_EOL;"

echo "Done."
