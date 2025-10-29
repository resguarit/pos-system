#!/bin/bash

# Deployment script for CLIENT A
# This script deploys the POS system to Client A's VPS

set -e  # Exit on error

echo "🚀 Starting deployment for CLIENT A..."

# Configuration
CLIENT_NAME="Client A"
VPS_HOST="${CLIENT_A_VPS_HOST}"
VPS_PORT="${CLIENT_A_VPS_PORT}"
VPS_USERNAME="${CLIENT_A_VPS_USERNAME}"
BACKEND_PATH="${CLIENT_A_BACKEND_DEPLOY_PATH}"
FRONTEND_PATH="${CLIENT_A_FRONTEND_DEPLOY_PATH}"

# Deploy Backend
echo "📦 Deploying backend for $CLIENT_NAME..."
ssh -p $VPS_PORT $VPS_USERNAME@$VPS_HOST << 'ENDSSH'
cd $BACKEND_PATH
echo "📍 Current directory: $(pwd)"
echo "🔄 Pulling latest code..."
git pull origin master
echo "📦 Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader
echo "🧹 Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
echo "🗄️ Running migrations..."
php artisan migrate --force
echo "⚡ Optimizing for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo "✅ Backend deployment completed for $CLIENT_NAME"
ENDSSH

echo "✅ Deployment completed successfully for $CLIENT_NAME!"
