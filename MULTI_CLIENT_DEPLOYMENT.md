# 🏢 Multi-Client Deployment Guide

This guide explains how to deploy the same POS system to multiple VPS with different domains and databases for different clients.

## 📋 Overview

You can deploy the same codebase to multiple clients by:
1. **Different VPS servers** (one per client or multiple clients per VPS)
2. **Different domains** (e.g., `cliente-a.com`, `cliente-b.com`)
3. **Different databases** (completely isolated data)
4. **Separate deployment pipelines** (GitHub Actions workflows)

## 🏗️ Architecture Options

### Option 1: One VPS per Client (Recommended)
- Each client has their own VPS
- Maximum isolation and security
- Easier to manage and scale individually
- Best for clients with different requirements

### Option 2: Multiple Clients on Same VPS
- Multiple virtual hosts on one VPS
- Lower cost but shared resources
- Requires careful management of shared resources
- Good for smaller clients

## 🚀 Quick Start

### Step 1: Configure GitHub Secrets

For each client, you need to configure the following secrets in GitHub:

#### Client A Secrets
```
CLIENT_A_VPS_HOST=ip_or_domain_client_a
CLIENT_A_VPS_PORT=22
CLIENT_A_VPS_USERNAME=posdeployer
CLIENT_A_VPS_SSH_KEY=<private_ssh_key>
CLIENT_A_BACKEND_DEPLOY_PATH=/home/api.cliente-a.com/public_html
CLIENT_A_FRONTEND_DEPLOY_PATH=/home/cliente-a.com/public_html
CLIENT_A_API_URL=https://api.cliente-a.com/api
```

#### Client B Secrets
```
CLIENT_B_VPS_HOST=ip_or_domain_client_b
CLIENT_B_VPS_PORT=22
CLIENT_B_VPS_USERNAME=posdeployer
CLIENT_B_VPS_SSH_KEY=<private_ssh_key>
CLIENT_B_BACKEND_DEPLOY_PATH=/home/api.cliente-b.com/public_html
CLIENT_B_FRONTEND_DEPLOY_PATH=/home/cliente-b.com/public_html
CLIENT_B_API_URL=https://api.cliente-b.com/api
```

### Step 2: Setup VPS for Each Client

#### On Each VPS:

```bash
# 1. Create deployment user
sudo addgroup posgroup
sudo adduser --ingroup posgroup posdeployer
sudo usermod -aG www-data posdeployer

# 2. Setup SSH keys
sudo mkdir -p /home/posdeployer/.ssh
sudo chown -R posdeployer:posgroup /home/posdeployer/.ssh
chmod 700 /home/posdeployer/.ssh
# Add your public key to authorized_keys

# 3. Create directory structure
sudo mkdir -p /home/cliente-x.com/public_html
sudo mkdir -p /home/api.cliente-x.com/public_html

# 4. Set permissions
sudo chown -R www-data:www-data /home/cliente-x.com/public_html
sudo chown -R www-data:www-data /home/api.cliente-x.com/public_html

# 5. Clone repository (one time)
cd /home/api.cliente-x.com
sudo git clone https://github.com/your-repo/pos-system.git public_html
sudo chown -R posdeployer:posgroup public_html
```

#### Create Database for Each Client:

```bash
sudo mysql -u root -p

# In MySQL console for Client A
CREATE DATABASE cliente_a_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cliente_a_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON cliente_a_pos.* TO 'cliente_a_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Repeat for Client B
CREATE DATABASE cliente_b_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cliente_b_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON cliente_b_pos.* TO 'cliente_b_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Configure Environment Files

For each client, create an `.env` file in the backend directory:

#### Client A: `/home/api.cliente-a.com/public_html/apps/backend/.env`
```env
APP_NAME="POS - Client A"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.cliente-a.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cliente_a_pos
DB_USERNAME=cliente_a_user
DB_PASSWORD=secure_password

CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Add other necessary configurations...
```

#### Client B: `/home/api.cliente-b.com/public_html/apps/backend/.env`
```env
APP_NAME="POS - Client B"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.cliente-b.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cliente_b_pos
DB_USERNAME=cliente_b_user
DB_PASSWORD=secure_password

CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Add other necessary configurations...
```

### Step 4: Configure Nginx

#### Nginx configuration for each client:

```nginx
# Client A - Frontend
server {
    listen 80;
    server_name cliente-a.com www.cliente-a.com;
    
    root /home/cliente-a.com/public_html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Client A - Backend API
server {
    listen 80;
    server_name api.cliente-a.com;
    
    root /home/api.cliente-a.com/public_html/public;
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

# Client B - Frontend
server {
    listen 80;
    server_name cliente-b.com www.cliente-b.com;
    
    root /home/cliente-b.com/public_html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Client B - Backend API
server {
    listen 80;
    server_name api.cliente-b.com;
    
    root /home/api.cliente-b.com/public_html/public;
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

### Step 5: Setup SSL Certificates

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# For Client A
sudo certbot --nginx -d cliente-a.com -d www.cliente-a.com
sudo certbot --nginx -d api.cliente-a.com

# For Client B
sudo certbot --nginx -d cliente-b.com -d www.cliente-b.com
sudo certbot --nginx -d api.cliente-b.com
```

## 🔄 Deployment Workflows

### Automatic Deployment

Push to `master` branch triggers deployments to configured clients:

```bash
# This will trigger all client deployments
git push origin master
```

### Manual Deployment

Use GitHub Actions UI to manually trigger deployments:

1. Go to **Actions** tab in GitHub
2. Select workflow:
   - `Deploy to Client A`
   - `Deploy to Client B`
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Selective Deployment

Workflows only trigger on relevant path changes:

- Backend changes (`apps/backend/**`) → Deploys all clients
- Frontend changes → Deploys all clients with updated build

## 📂 File Structure Per Client

```
VPS Root
├── /home/
│   ├── cliente-a.com/
│   │   └── public_html/          # Frontend build artifacts
│   ├── api.cliente-a.com/
│   │   └── public_html/          # Laravel backend (git repo)
│   │       ├── apps/
│   │       │   ├── backend/
│   │       │   │   ├── .env      # Client A config
│   │       │   │   └── ...
│   │       │   └── frontend/
│   │       └── ...
│   ├── cliente-b.com/
│   │   └── public_html/
│   └── api.cliente-b.com/
│       └── public_html/
└── ...
```

## 🗄️ Database Management

### Running Migrations

Each client's database is isolated. When you push migrations:

```bash
# Migrations run automatically via GitHub Actions for each client
# Each client's database stays in sync with the code
```

### Manual Migration

```bash
# Client A
cd /home/api.cliente-a.com/public_html
php artisan migrate

# Client B
cd /home/api.cliente-b.com/public_html
php artisan migrate
```

### Database Backups

```bash
# Backup Client A
mysqldump -u cliente_a_user -p cliente_a_pos > backup_cliente_a_$(date +%Y%m%d).sql

# Backup Client B
mysqldump -u cliente_b_user -p cliente_b_pos > backup_cliente_b_$(date +%Y%m%d).sql
```

## 🔧 Adding a New Client

To add a new client (Client C):

1. **Create configuration file**: `client-c-config.env`
2. **Create GitHub workflow**: `.github/workflows/deploy-client-c.yml`
3. **Add GitHub Secrets**: `CLIENT_C_*` secrets
4. **Setup VPS**: Follow Steps 2-5 in Quick Start
5. **Test deployment**: Run workflow manually

## 🧪 Testing Deployment

```bash
# Test Client A
curl https://cliente-a.com
curl https://api.cliente-a.com/api/health

# Test Client B
curl https://cliente-b.com
curl https://api.cliente-b.com/api/health
```

## 🔍 Monitoring

### Check Status of All Clients

```bash
# Create monitoring script
#!/bin/bash
for client in cliente-a.com cliente-b.com; do
  echo "Checking $client..."
  curl -I https://$client | head -n 1
  curl -I https://api.$client/health | head -n 1
done
```

### Log Monitoring

```bash
# Client A logs
tail -f /home/api.cliente-a.com/public_html/storage/logs/laravel.log

# Client B logs
tail -f /home/api.cliente-b.com/public_html/storage/logs/laravel.log
```

## ⚠️ Important Considerations

### 1. Code Isolation
- All clients share the **same codebase**
- Each client has **separate database**
- **No code customization** in deployment (use feature flags if needed)

### 2. Security
- Each client has isolated database credentials
- Use different SSH keys for each VPS if possible
- Regular security updates required for all VPS

### 3. Updates
- Code changes affect **all clients** immediately
- Test thoroughly before pushing to master
- Consider feature flags for client-specific features

### 4. Resources
- Monitor VPS resources for each client
- Set up alerts for high CPU/memory usage
- Consider scaling if needed

## 🔄 Rollback Procedure

If deployment fails:

```bash
# SSH into client's VPS
ssh -p 5507 posdeployer@VPS_HOST

# Client A
cd /home/api.cliente-a.com/public_html
git log --oneline -10
git checkout <previous-stable-commit>
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache

# Repeat for other clients
```

## 📊 Best Practices

1. **Use environment variables** for all client-specific config
2. **Keep `.env` files secure** and never commit them
3. **Test on staging first** before production deployment
4. **Monitor deployments** for errors
5. **Backup databases regularly** before migrations
6. **Document client-specific customizations** separately
7. **Use feature flags** for optional features

## 🆘 Troubleshooting

### Deployment Fails for One Client

1. Check GitHub Actions logs for that client
2. SSH into the VPS and check Laravel logs
3. Verify database connectivity
4. Check file permissions
5. Verify environment variables

### Database Connection Errors

```bash
# Test database connection
php artisan tinker
# In tinker:
DB::connection()->getPdo();
```

### Frontend Not Loading

1. Check if build artifacts exist in `/home/*/public_html`
2. Verify Nginx configuration
3. Check browser console for errors
4. Verify API URL in frontend build

## 📞 Support

For issues or questions:
- Check this documentation first
- Review GitHub Actions logs
- Check server logs
- Verify configuration files

---

**Created**: 2025
**Last Updated**: 2025
**Version**: 1.0
