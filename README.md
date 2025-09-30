# POS System

A modern Point of Sale (POS) system built with React/TypeScript and Laravel, organized as a monorepo for better development and deployment management.

## 🏗️ Architecture

This project uses a **monorepo structure** with the following organization:

```
pos-system/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   └── backend/           # Laravel + PHP
├── .github/workflows/     # CI/CD pipelines
├── scripts/               # Development and deployment scripts
└── package.json           # Monorepo configuration
```

## ✨ Features

- **Product Management**: Complete product catalog with categories, suppliers, and stock management
- **Sales System**: Point of sale interface with real-time calculations
- **Inventory Control**: Stock tracking, adjustments, and low stock alerts
- **Customer Management**: Customer database with purchase history
- **Financial Reports**: Sales reports, profit analysis, and cash register management
- **Multi-branch Support**: Manage multiple store locations
- **User Management**: Role-based access control with permissions
- **Real-time Validation**: Duplicate detection and form validation
- **PDF Generation**: Receipts, invoices, and reports
- **Automated Deployment**: CI/CD pipelines for seamless deployment

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Hook Form** for form handling
- **React Router** for navigation

### Backend
- **Laravel 11** with PHP 8.1+
- **MySQL** database
- **Laravel Sanctum** for API authentication
- **Laravel DomPDF** for PDF generation
- **Laravel Activity Log** for audit trails

### DevOps
- **GitHub Actions** for CI/CD
- **Lerna** for monorepo management
- **Docker** support (optional)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PHP** 8.1+ and Composer
- **MySQL** 8.0+
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Install all dependencies**
   ```bash
   # Using the development script
   ./scripts/dev.sh install
   
   # Or manually
   npm install
   cd apps/frontend && npm install && cd ../..
   cd apps/backend && composer install && cd ../..
   ```

3. **Configure environment variables**
   ```bash
   # Frontend
   cp apps/frontend/.env.example apps/frontend/.env.development
   
   # Backend
   cp apps/backend/.env.example apps/backend/.env
   ```

4. **Set up the database**
   ```bash
   cd apps/backend
   php artisan migrate
   php artisan db:seed
   cd ../..
   ```

5. **Start development servers**
   ```bash
   # Using the development script
   ./scripts/dev.sh dev
   
   # Or manually
   npm run dev
   ```

## 📝 Development

### Available Scripts

```bash
# Development
./scripts/dev.sh install    # Install all dependencies
./scripts/dev.sh dev        # Start development servers
./scripts/dev.sh build      # Build for production
./scripts/dev.sh test       # Run all tests
./scripts/dev.sh lint       # Lint code
./scripts/dev.sh check      # Check dependencies

# Deployment
./scripts/deploy.sh frontend  # Deploy frontend only
./scripts/deploy.sh backend   # Deploy backend only
./scripts/deploy.sh all       # Deploy both
./scripts/deploy.sh check     # Check deployment environment
```

### Monorepo Commands

```bash
# Root level
npm run dev              # Start both frontend and backend
npm run build            # Build frontend
npm run install:all      # Install all dependencies
npm run lint             # Lint frontend
npm run test             # Run frontend tests

# Frontend specific
cd apps/frontend
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
npm run test             # Run tests

# Backend specific
cd apps/backend
php artisan serve        # Start Laravel dev server
php artisan test         # Run tests
php artisan migrate      # Run migrations
php artisan db:seed      # Seed database
```

## 🚀 Deployment

### Automated Deployment (Recommended)

The project includes GitHub Actions workflows for automated deployment:

- **CI Pipeline**: Runs tests and builds on every push
- **Deploy Pipeline**: Automatically deploys to VPS on master branch
- **Manual Deployment**: Trigger deployments manually via GitHub Actions

### Manual Deployment

1. **Set environment variables**
   ```bash
   export VPS_HOST="your-vps-host"
   export VPS_USERNAME="your-username"
   export FRONTEND_DEPLOY_PATH="/var/www/html"
   export BACKEND_DEPLOY_PATH="/var/www/pos-backend"
   ```

2. **Deploy**
   ```bash
   ./scripts/deploy.sh all
   ```

### VPS Setup

1. **Install dependencies**
   ```bash
   # Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # PHP and Composer
   sudo apt-get install php8.1 php8.1-mysql php8.1-xml php8.1-mbstring
   curl -sS https://getcomposer.org/installer | php
   sudo mv composer.phar /usr/local/bin/composer
   
   # MySQL
   sudo apt-get install mysql-server
   ```

2. **Configure web server**
   - **Frontend**: Serve static files from `/var/www/html`
   - **Backend**: Configure PHP-FPM and Nginx/Apache

## 🔧 Configuration

### Frontend Configuration

```typescript
// apps/frontend/src/lib/api/config.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  environment: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}
```

### Backend Configuration

```php
// apps/backend/config/app.php
'name' => env('APP_NAME', 'POS System'),
'env' => env('APP_ENV', 'production'),
'debug' => env('APP_DEBUG', false),
'url' => env('APP_URL', 'http://localhost'),
```

## 🧪 Testing

```bash
# Frontend tests
cd apps/frontend
npm test

# Backend tests
cd apps/backend
php artisan test

# All tests
./scripts/dev.sh test
```

## 📊 Monitoring

- **Laravel Logs**: `apps/backend/storage/logs/laravel.log`
- **Activity Logs**: Database table `activity_log`
- **Error Tracking**: Configure in Laravel for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Changelog

### v1.0.0
- Initial monorepo setup
- Complete POS system implementation
- Automated deployment pipelines
- Comprehensive documentation