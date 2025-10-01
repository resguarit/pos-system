# 🚀 Deployment Guide

This guide covers the complete deployment process for the POS System, including automated and manual deployment methods.

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB free space
- **Network**: Public IP with SSH access

### Software Requirements
- **Node.js**: 18+ with npm
- **PHP**: 8.1+ with Composer
- **MySQL**: 8.0+
- **Web Server**: Nginx or Apache
- **Git**: Latest version

## 🔧 VPS Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PHP 8.1 and extensions
sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-xml php8.1-mbstring php8.1-curl php8.1-zip php8.1-gd

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### 2. Web Server Configuration

#### Nginx Configuration

```nginx
# Frontend (heroedelwhisky.com.ar)
server {
    listen 80;
    server_name heroedelwhisky.com.ar www.heroedelwhisky.com.ar;
    root /home/heroedelwhisky.com.ar/public_html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API (api.heroedelwhisky.com.ar)
server {
    listen 80;
    server_name api.heroedelwhisky.com.ar;
    root /home/api.heroedelwhisky.com.ar/public_html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

### 3. Directory Structure Setup

```bash
# Create deployment directories
sudo mkdir -p /home/heroedelwhisky.com.ar/public_html
sudo mkdir -p /home/api.heroedelwhisky.com.ar/public_html

# Set proper permissions
sudo chown -R www-data:www-data /home/heroedelwhisky.com.ar/public_html
sudo chown -R www-data:www-data /home/api.heroedelwhisky.com.ar/public_html
sudo chmod -R 755 /home/heroedelwhisky.com.ar/public_html
sudo chmod -R 755 /home/api.heroedelwhisky.com.ar/public_html
```

### 4. Database Setup

```bash
# Create database and user
sudo mysql -u root -p

# In MySQL console:
CREATE DATABASE pos_system;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pos_system.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 🔐 GitHub Actions Configuration

### 1. Repository Secrets

Configure the following secrets in your GitHub repository:

| Secret | Value | Description |
|--------|-------|-------------|
| `VPS_HOST` | `149.50.138.145` | VPS IP address |
| `VPS_PORT` | `5507` | SSH port |
| `VPS_USERNAME` | `root` | SSH username |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH...` | Private SSH key |
| `FRONTEND_DEPLOY_PATH` | `/home/heroedelwhisky.com.ar/public_html` | Frontend deploy path |
| `BACKEND_DEPLOY_PATH` | `/home/api.heroedelwhisky.com.ar/public_html` | Backend deploy path |
| `VITE_API_URL` | `https://api.heroedelwhisky.com.ar/api` | API URL for frontend |

### 2. SSH Key Setup

```bash
# Generate SSH key pair (if not exists)
ssh-keygen -t rsa -b 4096 -C "github-actions@pos-system"

# Copy public key to VPS
ssh-copy-id -p 5507 root@149.50.138.145

# Add private key to GitHub Secrets
cat ~/.ssh/id_rsa
# Copy the entire output including headers
```

## 🚀 Deployment Methods

### Automated Deployment (Recommended)

#### Trigger Methods

1. **Automatic**: Push to `master` branch
2. **Manual**: GitHub Actions → Run workflow
3. **Selective**: Push to specific paths

#### Workflow Types

- **Full Deployment**: `deploy.yml` - Deploys both frontend and backend
- **Frontend Only**: `deploy-frontend.yml` - Deploys only frontend
- **Backend Only**: `deploy-backend.yml` - Deploys only backend
- **CI Pipeline**: `ci.yml` - Runs tests and validation

### Manual Deployment

#### Using Deployment Script

```bash
# Set environment variables
export VPS_HOST="149.50.138.145"
export VPS_PORT="5507"
export VPS_USERNAME="root"
export FRONTEND_DEPLOY_PATH="/home/heroedelwhisky.com.ar/public_html"
export BACKEND_DEPLOY_PATH="/home/api.heroedelwhisky.com.ar/public_html"

# Deploy both applications
./scripts/deploy.sh all

# Deploy frontend only
./scripts/deploy.sh frontend

# Deploy backend only
./scripts/deploy.sh backend

# Check deployment environment
./scripts/deploy.sh check
```

#### Manual Steps

```bash
# Frontend deployment
cd apps/frontend
npm run build
scp -P 5507 -r dist/* root@149.50.138.145:/home/heroedelwhisky.com.ar/public_html/

# Backend deployment
ssh -p 5507 root@149.50.138.145
cd /home/api.heroedelwhisky.com.ar/public_html
git pull origin master
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

## 🔍 Monitoring and Maintenance

### Health Checks

```bash
# Check frontend
curl -I https://heroedelwhisky.com.ar

# Check backend API
curl -I https://api.heroedelwhisky.com.ar/api/health

# Check database connection
cd /home/api.heroedelwhisky.com.ar/public_html
php artisan tinker
# In tinker: DB::connection()->getPdo();
```

### Log Monitoring

```bash
# Laravel logs
tail -f /home/api.heroedelwhisky.com.ar/public_html/storage/logs/laravel.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PHP-FPM logs
tail -f /var/log/php8.1-fpm.log
```

### Performance Monitoring

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep -E "(nginx|php|mysql)"
```

## 🛠️ Troubleshooting

### Common Issues

#### Deployment Fails
1. Check GitHub Actions logs
2. Verify SSH connectivity: `ssh -p 5507 root@149.50.138.145`
3. Check VPS disk space: `df -h`
4. Verify file permissions

#### Build Errors
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall dependencies: `npm install --force`
3. Check for native dependency issues

#### Database Issues
1. Check MySQL status: `sudo systemctl status mysql`
2. Verify database credentials
3. Check Laravel logs for database errors

#### Web Server Issues
1. Check Nginx status: `sudo systemctl status nginx`
2. Test configuration: `sudo nginx -t`
3. Check error logs: `tail -f /var/log/nginx/error.log`

### Recovery Procedures

#### Rollback Deployment
```bash
# Frontend rollback
cd /home/heroedelwhisky.com.ar/public_html
git log --oneline -10
git checkout <previous-commit-hash>

# Backend rollback
cd /home/api.heroedelwhisky.com.ar/public_html
git log --oneline -10
git checkout <previous-commit-hash>
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

#### Emergency Maintenance
```bash
# Put site in maintenance mode
cd /home/api.heroedelwhisky.com.ar/public_html
php artisan down --message="Maintenance in progress"

# Perform maintenance tasks
# ...

# Bring site back online
php artisan up
```

## 📊 Performance Optimization

### Frontend Optimization
- Enable gzip compression in Nginx
- Set proper cache headers
- Use CDN for static assets
- Implement lazy loading

### Backend Optimization
- Enable OPcache
- Use Redis for caching
- Optimize database queries
- Implement API rate limiting

### Server Optimization
- Enable HTTP/2
- Configure SSL/TLS
- Set up monitoring
- Implement backup strategy

## 🔒 Security Considerations

### SSL/TLS Configuration
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d heroedelwhisky.com.ar -d www.heroedelwhisky.com.ar
sudo certbot --nginx -d api.heroedelwhisky.com.ar

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Hardening
- Configure firewall (UFW)
- Disable root login
- Use SSH keys only
- Regular security updates
- Monitor access logs

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer setup
- Multiple application instances
- Database replication
- CDN implementation

### Vertical Scaling
- Increase server resources
- Optimize application code
- Database optimization
- Caching strategies

---

For additional support, refer to the main [README.md](./README.md) or create an issue in the repository.
