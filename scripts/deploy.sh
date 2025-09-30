#!/bin/bash

# POS System Deployment Script
# This script helps with deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
VPS_HOST="${VPS_HOST:-149.50.138.145}"
VPS_PORT="${VPS_PORT:-5507}"
VPS_USERNAME="${VPS_USERNAME:-root}"
FRONTEND_DEPLOY_PATH="${FRONTEND_DEPLOY_PATH:-/home/heroedelwhisky.com.ar/public_html}"
BACKEND_DEPLOY_PATH="${BACKEND_DEPLOY_PATH:-/home/api.heroedelwhisky.com.ar/public_html}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check deployment dependencies
check_dependencies() {
    print_status "Checking deployment dependencies..."
    
    if ! command_exists rsync; then
        print_error "rsync is not installed"
        exit 1
    fi
    
    if ! command_exists ssh; then
        print_error "ssh is not installed"
        exit 1
    fi
    
    print_success "All deployment dependencies are installed"
}

# Check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ -z "$VPS_HOST" ]; then
        print_error "VPS_HOST environment variable is not set"
        exit 1
    fi
    
    if [ -z "$VPS_USERNAME" ]; then
        print_error "VPS_USERNAME environment variable is not set"
        exit 1
    fi
    
    print_success "Environment variables are set"
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend..."
    
    # Build frontend
    print_status "Building frontend..."
    cd apps/frontend
    npm run build
    cd ../..
    
    # Deploy to VPS
    print_status "Uploading frontend to VPS..."
    rsync -avz --delete -e "ssh -p $VPS_PORT" apps/frontend/dist/ "$VPS_USERNAME@$VPS_HOST:$FRONTEND_DEPLOY_PATH/"
    
    print_success "Frontend deployed successfully"
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend..."
    
    # Deploy to VPS
    print_status "Uploading backend to VPS..."
    rsync -avz --delete --exclude='vendor/' --exclude='node_modules/' --exclude='.git/' -e "ssh -p $VPS_PORT" apps/backend/ "$VPS_USERNAME@$VPS_HOST:$BACKEND_DEPLOY_PATH/"
    
    # Run deployment commands on VPS
    print_status "Running deployment commands on VPS..."
    ssh -p "$VPS_PORT" "$VPS_USERNAME@$VPS_HOST" << EOF
        cd $BACKEND_DEPLOY_PATH
        composer install --no-dev --optimize-autoloader
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache
        php artisan migrate --force
EOF
    
    print_success "Backend deployed successfully"
}

# Deploy both
deploy_all() {
    print_status "Deploying entire system..."
    
    deploy_frontend
    deploy_backend
    
    print_success "System deployed successfully"
}

# Show help
show_help() {
    echo "POS System Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  frontend    Deploy frontend only"
    echo "  backend     Deploy backend only"
    echo "  all         Deploy both frontend and backend"
    echo "  check       Check dependencies and environment"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  VPS_HOST              VPS hostname or IP (default: 149.50.138.145)"
    echo "  VPS_PORT              VPS SSH port (default: 5507)"
    echo "  VPS_USERNAME          VPS username (default: root)"
    echo "  FRONTEND_DEPLOY_PATH  Frontend deployment path (default: /home/heroedelwhisky.com.ar/public_html)"
    echo "  BACKEND_DEPLOY_PATH   Backend deployment path (default: /home/api.heroedelwhisky.com.ar/public_html)"
    echo ""
    echo "Example:"
    echo "  $0 all  # Deploy to both sites"
    echo "  $0 frontend  # Deploy only frontend to heroedelwhisky.com.ar"
    echo "  $0 backend   # Deploy only backend to api.heroedelwhisky.com.ar"
    echo ""
}

# Main script logic
case "${1:-help}" in
    frontend)
        check_dependencies
        check_env
        deploy_frontend
        ;;
    backend)
        check_dependencies
        check_env
        deploy_backend
        ;;
    all)
        check_dependencies
        check_env
        deploy_all
        ;;
    check)
        check_dependencies
        check_env
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
