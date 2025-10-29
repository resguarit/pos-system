# 🚀 Multi-Client Setup - Quick Reference

## 📝 Step-by-Step Checklist

### 1️⃣ GitHub Secrets Setup

Go to: **Settings → Secrets and variables → Actions**

Add for **Client A**:
```
CLIENT_A_VPS_HOST=IP_VPS_A
CLIENT_A_VPS_PORT=22
CLIENT_A_VPS_USERNAME=posdeployer
CLIENT_A_VPS_SSH_KEY=<private_ssh_key>
CLIENT_A_BACKEND_DEPLOY_PATH=/home/api.cliente-a.com/public_html
CLIENT_A_FRONTEND_DEPLOY_PATH=/home/cliente-a.com/public_html
CLIENT_A_API_URL=https://api.cliente-a.com/api
```

Add for **Client B**:
```
CLIENT_B_VPS_HOST=IP_VPS_B
CLIENT_B_VPS_PORT=22
CLIENT_B_VPS_USERNAME=posdeployer
CLIENT_B_VPS_SSH_KEY=<private_ssh_key>
CLIENT_B_BACKEND_DEPLOY_PATH=/home/api.cliente-b.com/public_html
CLIENT_B_FRONTEND_DEPLOY_PATH=/home/cliente-b.com/public_html
CLIENT_B_API_URL=https://api.cliente-b.com/api
```

### 2️⃣ On Each VPS - Initial Setup

```bash
# 1. Create user
sudo adduser --ingroup www-data posdeployer

# 2. Create directories
sudo mkdir -p /home/cliente-x.com/public_html
sudo mkdir -p /home/api.cliente-x.com/public_html
sudo chown -R posdeployer:www-data /home/cliente-x.com
sudo chown -R posdeployer:www-data /home/api.cliente-x.com

# 3. Clone repo (one time, for backend)
cd /home/api.cliente-x.com
sudo git clone https://github.com/your-repo/pos-system.git public_html
sudo chown -R posdeployer:www-data public_html
```

### 3️⃣ Database Setup for Each Client

```bash
sudo mysql -u root -p

# Create database
CREATE DATABASE cliente_x_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'cliente_x_user'@'localhost' IDENTIFIED BY 'secure_password';

# Grant permissions
GRANT ALL PRIVILEGES ON cliente_x_pos.* TO 'cliente_x_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4️⃣ Create .env File for Each Client

In `/home/api.cliente-x.com/public_html/apps/backend/.env`:

```env
APP_NAME="POS - Client X"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.cliente-x.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cliente_x_pos
DB_USERNAME=cliente_x_user
DB_PASSWORD=secure_password

CACHE_DRIVER=file
SESSION_DRIVER=file
```

### 5️⃣ Nginx Configuration

Create `/etc/nginx/sites-available/cliente-x.conf`:

```nginx
# Frontend
server {
    listen 80;
    server_name cliente-x.com www.cliente-x.com;
    root /home/cliente-x.com/public_html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}

# Backend API
server {
    listen 80;
    server_name api.cliente-x.com;
    root /home/api.cliente-x.com/public_html/public;
    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cliente-x.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6️⃣ SSL Setup

```bash
sudo certbot --nginx -d cliente-x.com -d www.cliente-x.com -d api.cliente-x.com
```

### 7️⃣ First Deployment

1. Go to **GitHub → Actions**
2. Select **Deploy to Client A** or **Deploy to Client B**
3. Click **Run workflow** → **Run workflow**

## 🎯 Deployment

### Automatic (on push to master)
```bash
git push origin master
```

### Manual (via GitHub UI)
1. Actions → Select workflow → Run workflow

## 🔍 Verification

```bash
# Check if deployment worked
curl https://cliente-x.com
curl https://api.cliente-x.com/api/health

# Check logs if issues
tail -f /home/api.cliente-x.com/public_html/storage/logs/laravel.log
```

## 📦 What Gets Deployed?

- **Frontend**: Built React app from `apps/frontend/dist/`
- **Backend**: Laravel API from `apps/backend/`
- **Database**: Migrations run automatically
- **Config**: Uses `.env` file on each VPS

## ⚠️ Key Differences Between Clients

| Aspect | Client A | Client B |
|--------|----------|----------|
| VPS | Different VPS | Different VPS |
| Domain | cliente-a.com | cliente-b.com |
| Database | cliente_a_pos | cliente_b_pos |
| Credentials | Isolated | Isolated |
| Code | Same | Same |

## 🛠️ Common Commands

```bash
# Check deployment status
cd /home/api.cliente-x.com/public_html
git status

# Run migrations manually
php artisan migrate

# Clear caches
php artisan config:clear
php artisan cache:clear

# Check logs
tail -f storage/logs/laravel.log
```

## ❓ Troubleshooting

### Deployment fails
1. Check GitHub Actions logs
2. SSH to VPS and check Laravel logs
3. Verify permissions on storage/

### Frontend not loading
1. Check if files exist in `/home/cliente-x.com/public_html`
2. Verify Nginx config
3. Check browser console

### Database errors
1. Verify .env file exists
2. Test connection: `php artisan tinker` → `DB::connection()->getPdo()`
3. Check user permissions in MySQL

## 📞 Need Help?

See full documentation: [MULTI_CLIENT_DEPLOYMENT.md](./MULTI_CLIENT_DEPLOYMENT.md)
