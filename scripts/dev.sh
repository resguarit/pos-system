#!/bin/bash

# POS System Development Script
# This script helps with development tasks

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command_exists php; then
        print_error "PHP is not installed"
        exit 1
    fi
    
    if ! command_exists composer; then
        print_error "Composer is not installed"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install all dependencies
install_all() {
    print_status "Installing all dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd apps/frontend
    npm install
    cd ../..
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd apps/backend
    composer install
    cd ../..
    
    print_success "All dependencies installed"
}

# Start development servers
start_dev() {
    print_status "Starting development servers..."
    
    # Start both frontend and backend in parallel
    npm run dev
}

# Build for production
build_production() {
    print_status "Building for production..."
    
    # Build frontend
    print_status "Building frontend..."
    cd apps/frontend
    npm run build
    cd ../..
    
    print_success "Production build completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd apps/frontend
    npm test --if-present
    cd ../..
    
    # Backend tests
    print_status "Running backend tests..."
    cd apps/backend
    php artisan test
    cd ../..
    
    print_success "All tests completed"
}

# Lint code
lint_code() {
    print_status "Linting code..."
    
    # Frontend linting
    print_status "Linting frontend..."
    cd apps/frontend
    npm run lint
    cd ../..
    
    print_success "Linting completed"
}

# Show help
show_help() {
    echo "POS System Development Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     Install all dependencies"
    echo "  dev         Start development servers"
    echo "  build       Build for production"
    echo "  test        Run all tests"
    echo "  lint        Lint code"
    echo "  check       Check dependencies"
    echo "  help        Show this help message"
    echo ""
}

# Main script logic
case "${1:-help}" in
    install)
        check_dependencies
        install_all
        ;;
    dev)
        check_dependencies
        start_dev
        ;;
    build)
        check_dependencies
        build_production
        ;;
    test)
        check_dependencies
        run_tests
        ;;
    lint)
        check_dependencies
        lint_code
        ;;
    check)
        check_dependencies
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
