#!/bin/bash

# Deploy migrations to all clients on the server
# Execute this script directly on the VPS
# Usage: ./deploy-migrations-all-clients.sh

set -e

echo "🚀 Starting deployment to all clients..."
echo ""

# Array to track results
declare -a success_clients
declare -a failed_clients

# Navigate to /home and find all api.* directories
echo "📂 Navigating to /home..."
cd /home

echo "🔍 Searching for api.* directories..."
API_DIRS=$(ls -d api.* 2>/dev/null || echo "")
echo "Found: $API_DIRS"

if [ -z "$API_DIRS" ]; then
  echo "❌ No api.* directories found in /home"
  exit 1
fi

total_count=0
success_count=0

echo ""
echo "Starting iteration..."

# Iterate through each API directory
for api_dir in $API_DIRS; do
  echo "Processing: $api_dir"
  
  if [ ! -d "$api_dir" ]; then
    echo "Skipping $api_dir - not a directory"
    continue
  fi
  
  total_count=$((total_count + 1))
  
  # Extract client name from directory (e.g., api.hela-ditos.com.ar -> hela-ditos)
  client_name=$(echo "$api_dir" | sed 's/api\.//' | sed 's/\.com\.ar$//' | sed 's/\.net\.ar$//')
  
  # Determine backend path (usually in public_html/apps/backend)
  BACKEND_PATH=""
  
  if [ -d "$api_dir/public_html/apps/backend" ] && [ -f "$api_dir/public_html/apps/backend/artisan" ]; then
    BACKEND_PATH="$api_dir/public_html/apps/backend"
  elif [ -d "$api_dir/public_html" ] && [ -f "$api_dir/public_html/artisan" ]; then
    BACKEND_PATH="$api_dir/public_html"
  elif [ -f "$api_dir/artisan" ]; then
    BACKEND_PATH="$api_dir"
  fi
  
  if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH/artisan" ]; then
    echo "⚠️  Skipping $client_name - Laravel application not found in $api_dir"
    failed_clients+=("$client_name (app not found)")
    continue
  fi
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Deploying to: $client_name"
  echo "📍 Path: $BACKEND_PATH"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if cd "$BACKEND_PATH" 2>/dev/null; then
    # Git pull
    echo "🔄 Pulling latest code..."
    if ! git pull origin master 2>/dev/null; then
      echo "⚠️  Git pull failed or not a git repository"
    fi
    
    # Composer install
    echo "📦 Installing composer dependencies..."
    if command -v composer &> /dev/null; then
      composer install --no-dev --optimize-autoloader 2>&1 | grep -E "(^Installing|^Updating|^Autoloading|completed)" || true
    else
      echo "⚠️  Composer not found, skipping"
    fi
    
    # Run migrations
    echo "🗄️  Running migrations..."
    if php artisan migrate --force; then
      echo "✅ Migrations completed for $client_name"
      success_clients+=("$client_name")
      success_count=$((success_count + 1))
    else
      echo "❌ Migrations failed for $client_name"
      failed_clients+=("$client_name (migration error)")
    fi
    
    # Grant all permissions to admin
    echo "🔐 Granting all permissions to admin..."
    if php artisan admin:grant-all-permissions 2>/dev/null; then
      echo "✅ Permissions granted for $client_name"
    else
      echo "⚠️  Permission grant failed or command not found for $client_name"
    fi
    
    # Clear caches
    echo "🧹 Clearing caches..."
    php artisan config:clear 2>/dev/null || true
    php artisan cache:clear 2>/dev/null || true
    php artisan route:clear 2>/dev/null || true
    php artisan view:clear 2>/dev/null || true
    
    cd /home
    echo ""
  else
    echo "❌ Failed to access $BACKEND_PATH"
    failed_clients+=("$client_name (access denied)")
  fi
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total clients processed: $total_count"
echo "✅ Successful: $success_count"
echo "❌ Failed: $((total_count - success_count))"
echo ""

if [ $success_count -gt 0 ]; then
  echo "✅ Success:"
  for client in "${success_clients[@]}"; do
    echo "  ✓ $client"
  done
fi

if [ ${#failed_clients[@]} -gt 0 ]; then
  echo ""
  echo "❌ Failed:"
  for client in "${failed_clients[@]}"; do
    echo "  ✗ $client"
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $success_count -eq $total_count ]; then
  echo "✅ All clients deployed successfully!"
  exit 0
else
  echo "⚠️  Some clients failed deployment"
  exit 1
fi
