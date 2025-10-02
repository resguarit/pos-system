# POS System

A modern Point of Sale (POS) system built with React/TypeScript and Laravel, organized as a monorepo for better development and deployment management.

## 🏗️ Architecture

This project uses a **monorepo structure** with the following organization:

```
pos-system/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   │   ├── src/           # Source code
│   │   ├── public/        # Static assets
│   │   ├── dist/          # Built files (production)
│   │   └── package.json   # Frontend dependencies
│   └── backend/           # Laravel + PHP
│       ├── app/           # Application code
│       ├── config/        # Configuration files
│       ├── database/      # Migrations and seeders
│       ├── routes/        # API routes
│       ├── storage/       # Logs and cache
│       └── composer.json  # Backend dependencies
├── .github/workflows/     # CI/CD pipelines
│   ├── deploy.yml         # Full deployment workflow
│   ├── deploy-frontend.yml # Frontend-only deployment
│   ├── deploy-backend.yml  # Backend-only deployment
│   └── ci.yml             # Continuous integration
├── scripts/               # Development and deployment scripts
│   ├── dev.sh             # Development commands
│   └── deploy.sh          # Deployment commands
├── package.json           # Monorepo configuration
└── README.md              # This documentation
```

### Deployment Flow

```mermaid
graph TD
    A[Developer Push] --> B[GitHub Actions CI]
    B --> C{Tests Pass?}
    C -->|No| D[Build Failed]
    C -->|Yes| E[Build Frontend]
    E --> F[Deploy to VPS]
    F --> G[Update Backend]
    G --> H[Production Live]
    
    I[Manual Trigger] --> J[GitHub Actions Deploy]
    J --> E
```

### System Components

- **Frontend**: React SPA served as static files
- **Backend**: Laravel API with MySQL database
- **VPS**: Production server hosting both applications
- **GitHub Actions**: Automated CI/CD pipeline
- **SSH**: Secure deployment mechanism

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

#### GitHub Actions Secrets Configuration

Before using automated deployment, configure the following secrets in your GitHub repository:

| Secret | Description | Example Value |
|--------|-------------|---------------|
| `VPS_HOST` | VPS hostname or IP address | `149.50.138.145` |
| `VPS_PORT` | SSH port number | `5507` |
| `VPS_USERNAME` | SSH username | `root` |
| `VPS_SSH_KEY` | Private SSH key (full key including headers) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `FRONTEND_DEPLOY_PATH` | Frontend deployment directory | `/home/heroedelwhisky.com.ar/public_html` |
| `BACKEND_DEPLOY_PATH` | Backend deployment directory | `/home/api.heroedelwhisky.com.ar/public_html` |
| `VITE_API_URL` | API URL for frontend environment | `https://api.heroedelwhisky.com.ar/api` |

**How to configure secrets:**
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the exact name and value

#### Deployment Workflows

- **`deploy.yml`**: Full deployment (frontend + backend) on master branch push
- **`deploy-frontend.yml`**: Frontend-only deployment when `apps/frontend/**` changes
- **`deploy-backend.yml`**: Backend-only deployment when `apps/backend/**` changes
- **`ci.yml`**: Continuous integration pipeline for testing and validation

### Manual Deployment

1. **Set environment variables**
   ```bash
   export VPS_HOST="149.50.138.145"
   export VPS_PORT="5507"
   export VPS_USERNAME="root"
   export FRONTEND_DEPLOY_PATH="/home/heroedelwhisky.com.ar/public_html"
   export BACKEND_DEPLOY_PATH="/home/api.heroedelwhisky.com.ar/public_html"
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

This project is proprietary software owned by Resguar IT. All rights reserved.
See the [LICENSE](./LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

#### GitHub Actions Deployment Fails
- **Check secrets configuration**: Verify all required secrets are set in GitHub repository settings
- **SSH key issues**: Ensure the private key includes the full key with headers (`-----BEGIN OPENSSH PRIVATE KEY-----`)
- **VPS connectivity**: Test SSH connection manually: `ssh -p 5507 root@149.50.138.145`
- **Path permissions**: Verify deployment paths exist and have correct permissions

#### Build Errors
- **Node modules issues**: Clear and reinstall dependencies
  ```bash
  rm -rf node_modules package-lock.json
  npm install --force
  ```
- **Native dependencies**: Install platform-specific packages
  ```bash
  npm install @rollup/rollup-linux-x64-gnu --save-optional
  npm install @swc/core-linux-x64-gnu --save-optional
  npm install lightningcss-linux-x64-gnu --save-optional
  npm install @tailwindcss/oxide-linux-x64-gnu --save-optional
  ```
- **Composer issues**: Clear Composer cache and reinstall
  ```bash
  composer clear-cache
  composer install --no-dev --optimize-autoloader
  ```

#### Development Issues
- **Port conflicts**: Check if ports 3000 (frontend) or 8000 (backend) are in use
- **Database connection**: Verify MySQL is running and credentials are correct
- **Environment variables**: Check `.env` files are properly configured

#### Production Issues
- **File permissions**: Ensure web server has read access to deployment directories
- **PHP errors**: Check Laravel logs: `tail -f storage/logs/laravel.log`
- **Database migrations**: Run migrations manually if needed: `php artisan migrate --force`

### Debug Commands

```bash
# Check deployment environment
./scripts/deploy.sh check

# Check dependencies
./scripts/dev.sh check

# View Laravel logs
cd apps/backend && tail -f storage/logs/laravel.log

# Test SSH connection
ssh -p 5507 root@149.50.138.145

# Check GitHub Actions logs
# Go to repository → Actions tab → Select failed workflow run
```

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments
- Check troubleshooting section above

## 🔄 Changelog

### v1.0.0
- Initial monorepo setup
- Complete POS system implementation
- Automated deployment pipelines
- Comprehensive documentation
- GitHub Actions CI/CD workflows
- VPS deployment configuration
# Test deploy
# Test deploy 2
