# 🚀 Guía Completa: Configuración CI/CD para hela-ditos.com.ar (VPS Reseteado)

Esta guía te ayudará a configurar completamente el CI/CD de **hela-ditos.com.ar** después de resetear el VPS desde cero.

## 📋 Índice

1. [Configuración Inicial del VPS](#1-configuración-inicial-del-vps)
2. [Configuración de Dominios en CyberPanel](#2-configuración-de-dominios-en-cyberpanel)
3. [Clonar Repositorio y Configurar Backend](#3-clonar-repositorio-y-configurar-backend)
4. [Configurar Base de Datos](#4-configurar-base-de-datos)
5. [Configurar Permisos y Storage](#5-configurar-permisos-y-storage)
6. [Compilar y Desplegar Frontend (Primera Vez)](#6-compilar-y-desplegar-frontend-primera-vez)
7. [Configurar Secrets de GitHub para CI/CD](#7-configurar-secrets-de-github-para-cicd)
8. [Configurar SSL](#8-configurar-ssl)
9. [Verificación Final](#9-verificación-final)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Configuración Inicial del VPS

### 1.1. Instalar Dependencias Esenciales

Conéctate al VPS por SSH:

```bash
# Conectarte (ajusta puerto e IP según tu configuración)
ssh -p 5614 root@TU_IP_VPS
```

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git unzip software-properties-common
```

### 1.2. Instalar Node.js (vía NVM - Recomendado)

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar perfil
source ~/.bashrc
source ~/.nvm/nvm.sh

# Instalar Node.js 20
nvm install 20
nvm alias default 20

# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version
```

### 1.3. Instalar Composer

```bash
# Instalar Composer
EXPECTED_SIGNATURE=$(curl -s https://composer.github.io/installer.sig) \
  && php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
  && ACTUAL_SIGNATURE=$(php -r "echo hash_file('sha384', 'composer-setup.php');") \
  && [ "$EXPECTED_SIGNATURE" = "$ACTUAL_SIGNATURE" ] && php composer-setup.php --install-dir=/usr/local/bin --filename=composer && rm composer-setup.php

# Verificar instalación
composer --version
```

### 1.4. Verificar PHP

CyberPanel generalmente incluye PHP, pero verifica:

```bash
php --version  # Debe ser PHP 8.1 o superior
```

Si no está instalado:

```bash
sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-xml php8.1-mbstring php8.1-curl php8.1-zip php8.1-gd
```

---

## 2. Configuración de Dominios en CyberPanel   

### 2.1. Crear Sitio para Frontend

1. En CyberPanel: **Websites → Create Website**
2. **Domain**: `hela-ditos.com.ar`
3. **Email**: (opcional, para Let's Encrypt)
4. **PHP**: PHP 8.1
5. Clic en **Create Website**

Esto creará: `/home/hela-ditos.com.ar/public_html/`

### 2.2. Crear Sitio para Backend (API)

1. En CyberPanel: **Websites → Create Website**
2. **Domain**: `api.hela-ditos.com.ar` (como sitio **separado**, NO subdominio)
3. **Email**: (opcional)
4. **PHP**: PHP 8.1
5. Clic en **Create Website**

Esto creará: `/home/api.hela-ditos.com.ar/public_html/`

### 2.3. Configurar Document Root del Backend

**⚠️ IMPORTANTE:** El backend debe apuntar a `public` de Laravel.

1. En CyberPanel: **Websites → List Websites**
2. Selecciona **`api.hela-ditos.com.ar`**
3. Haz clic en **Manage**
4. En **Document Root**, cambia a:
   ```
   /home/api.hela-ditos.com.ar/public_html/apps/backend/public
   ```
5. Guarda cambios

---

## 3. Clonar Repositorio y Configurar Backend

### 3.1. Preparar Directorio del Backend

```bash
# Ir al directorio del backend
cd /home/api.hela-ditos.com.ar/public_html

# Limpiar si hay contenido previo
rm -rf * .* 2>/dev/null || true
```

### 3.2. Clonar Repositorio

**⚠️ IMPORTANTE:** Necesitas configurar una clave SSH para que el VPS pueda clonar el repositorio desde GitHub.

#### Paso 1: Generar Clave SSH para Clonar Repo

```bash
# Generar clave SSH si no existe
ssh-keygen -t ed25519 -C "vps-hela-ditos-clone" -f ~/.ssh/id_ed25519

# Presiona Enter para usar la ubicación por defecto
# Presiona Enter para no poner contraseña (o pon una si prefieres)

# Ver clave pública
cat ~/.ssh/id_ed25519.pub
```

#### Paso 2: Agregar Clave Pública en GitHub

1. Copia la clave pública completa que se muestra (empieza con `ssh-ed25519 ...`)
2. Ve a GitHub: **Settings → SSH and GPG keys → New SSH key**
3. **Title**: `VPS hela-ditos - Clone repo`
4. **Key**: Pega la clave pública completa
5. Haz clic en **Add SSH key**

#### Paso 3: Clonar el Repositorio

```bash
# Clonar usando SSH
git clone git@github.com:resguarit/pos-system.git .
```

**Nota:** Esta clave SSH es **solo para clonar el repositorio** en el VPS. Más adelante generaremos otra clave diferente para CI/CD.

### 3.3. Configurar Backend Laravel

```bash
# Ir al directorio del backend
cd /home/api.hela-ditos.com.ar/public_html/apps/backend

# Instalar dependencias de Composer
composer install --no-dev --optimize-autoloader

# Copiar archivo de entorno
cp .env.example .env

# Generar key de aplicación
php artisan key:generate
```

### 3.4. Configurar Archivo `.env`

Edita `/home/api.hela-ditos.com.ar/public_html/apps/backend/.env`:

```env
APP_NAME="POS System - Hela Ditos"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.hela-ditos.com.ar

# ⚠️ IMPORTANTE: Para CORS
FRONTEND_URL=https://hela-ditos.com.ar

# Base de datos (configuraremos en el siguiente paso)
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=api_hela_ditos_pos
DB_USERNAME=api_hela_ditos_user
DB_PASSWORD=1887Word

# Cache y Sesiones
CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Logs
LOG_CHANNEL=stack
LOG_LEVEL=error
```

---

## 4. Configurar Base de Datos

### 4.1. Crear Base de Datos y Usuario

```bash
# Acceder a MySQL
mysql -u root -p
```

En MySQL console:

```sql
CREATE DATABASE hela_ditos_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hela_ditos_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON hela_ditos_pos.* TO 'hela_ditos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.2. Actualizar `.env` con Contraseña Real

```bash
# Editar .env y reemplazar TU_CONTRASEÑA_SEGURA_AQUI con la contraseña real
nano /home/api.hela-ditos.com.ar/public_html/apps/backend/.env
```

### 4.3. Ejecutar Migraciones

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend

# Ejecutar migraciones
php artisan migrate --force
```

**⚠️ Si encuentras un error de foreign key relacionado con `combos`:**

Este error puede ocurrir porque la migración de `combos` se ejecuta después de la que necesita la foreign key. Solución:

```bash
# Ejecutar primero la migración de combos manualmente
php artisan migrate --path=database/migrations/2025_10_20_000001_create_combos_table.php --force

# Luego agregar la foreign key manualmente si es necesario
php artisan tinker
```

En tinker:

```php
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

if (Schema::hasTable('combos') && !Schema::hasColumn('sale_items', 'combo_id')) {
    DB::statement('ALTER TABLE sale_items ADD COLUMN combo_id BIGINT UNSIGNED NULL');
    DB::statement('ALTER TABLE sale_items ADD COLUMN is_combo BOOLEAN DEFAULT FALSE');
    
    $foreignKeys = DB::select("
        SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' 
        AND CONSTRAINT_NAME = 'sale_items_combo_id_foreign'
    ");
    
    if (empty($foreignKeys)) {
        DB::statement('
            ALTER TABLE sale_items 
            ADD CONSTRAINT sale_items_combo_id_foreign 
            FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE
        ');
    }
}

exit
```

Luego continuar:

```bash
# Marcar la migración como ejecutada (si falló)
php artisan migrate:status

# Continuar con migraciones restantes
php artisan migrate --force
```

### 4.4. Ejecutar Seeders

**⚠️ IMPORTANTE:** En producción (`APP_ENV=production`), `php artisan db:seed` ejecuta **SOLO los seeders de producción** (datos esenciales), NO los seeders de desarrollo (datos de prueba).

```bash
# Ejecutar seeders (solo producción en este entorno)
php artisan db:seed
```

O si prefieres ser explícito:

```bash
# Solo seeders de producción (recomendado para producción)
php artisan db:seed:production --force
```

**Nota:** Los seeders de producción incluyen:
- Configuraciones fiscales (IVA, condiciones fiscales, tipos de documento)
- Configuraciones de negocio (métodos de pago, tipos de movimiento)
- Sistema de permisos y roles
- Usuario administrador básico
- Configuraciones de ventas

---

## 5. Configurar Permisos y Storage

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend

# Crear directorios de storage
mkdir -p storage/app/public/system/logos
mkdir -p storage/app/public/system/favicons
mkdir -p storage/logs
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views

# Configurar permisos
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Crear symlink para storage público
php artisan storage:link

# Cache de configuración
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 6. Compilar y Desplegar Frontend (Primera Vez)

### 6.1. Instalar Dependencias del Frontend

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/frontend

# Instalar dependencias
npm install --force

# Instalar dependencias nativas para Linux (si es necesario)
npm install @rollup/rollup-linux-x64-gnu --save-optional
npm install @swc/core-linux-x64-gnu --save-optional
npm install lightningcss-linux-x64-gnu --save-optional
npm install @tailwindcss/oxide-linux-x64-gnu --save-optional
```

### 6.2. Configurar Variables de Entorno del Frontend

```bash
# Crear archivo .env.production
cat > .env.production << EOF
VITE_API_URL=https://api.hela-ditos.com.ar/api
VITE_APP_ENV=production
EOF
```

### 6.3. Compilar Frontend

```bash
# Compilar para producción
npm run build
```

### 6.4. Copiar Archivos Compilados

```bash
# Copiar archivos compilados al directorio público del frontend
cp -r dist/* /home/hela-ditos.com.ar/public_html/
```

---

## 7. Configurar Secrets de GitHub para CI/CD (Usando Environments)

### 7.1. Determinar qué Cliente es hela-ditos

**hela-ditos** corresponde a **Client A** y usa el environment `heladitos` en GitHub.

**Mapeo de Clients y Environments:**
- **Client A** → Environment: `heladitos` (hela-ditos.com.ar)
- **Client B** → Environment: `enriqueta` (laenriquetabar.com.ar)
- **Heroe del Whisky** → Environment: `heroe` (heroedelwhisky.com.ar)

### 7.2. Obtener Información del VPS

Necesitarás:
- **IP del VPS**: (ejemplo: `200.58.127.86`)
- **Puerto SSH**: (ejemplo: `5614`)
- **Usuario SSH**: (generalmente `root` o el usuario configurado)

### 7.3. Generar Clave SSH para CI/CD

**⚠️ IMPORTANTE:** Esta es una clave **DIFERENTE** a la que usaste para clonar el repo. Esta clave es para que GitHub Actions se conecte al VPS.

```bash
# En el VPS, generar clave SSH dedicada para GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-hela-ditos" -f ~/.ssh/github_actions_deploy -N ""

# Presiona Enter dos veces (sin contraseña para GitHub Actions)

# Ver clave privada (la necesitarás para GitHub Environment Secret)
cat ~/.ssh/github_actions_deploy
# ⚠️ COPIA TODO, incluyendo -----BEGIN OPENSSH PRIVATE KEY----- y -----END OPENSSH PRIVATE KEY-----

# Ver clave pública
cat ~/.ssh/github_actions_deploy.pub

# Autorizar la clave pública en el servidor (esto permite que GitHub Actions se conecte)
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
```

### 7.4. Crear GitHub Environment

1. Ve a tu repositorio en GitHub: `https://github.com/resguarit/pos-system`
2. Ve a **Settings → Environments**
3. Haz clic en **New environment**
4. **Name**: `heladitos`
5. Haz clic en **Configure environment**

### 7.5. Configurar Secrets en el Environment

En la página del environment que acabas de crear, ve a la sección **Environment secrets** y haz clic en **Add secret**. Agrega los siguientes secrets:

#### Para Client A (si hela-ditos es Client A):

| Secret Name | Valor | Ejemplo |
|------------|-------|---------|
| `CLIENT_A_VPS_HOST` | IP del VPS | `200.58.127.86` |
| `CLIENT_A_VPS_PORT` | Puerto SSH | `5614` |
| `CLIENT_A_VPS_USERNAME` | Usuario SSH | `root` |
| `CLIENT_A_VPS_SSH_KEY` | Clave privada SSH completa | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `CLIENT_A_BACKEND_DEPLOY_PATH` | Ruta del backend | `/home/api.hela-ditos.com.ar/public_html` |
| `CLIENT_A_FRONTEND_DEPLOY_PATH` | Ruta del frontend | `/home/hela-ditos.com.ar/public_html` |
| `CLIENT_A_API_URL` | URL de la API | `https://api.hela-ditos.com.ar/api` |

**Nota:** 
- La clave privada SSH (`CLIENT_A_VPS_SSH_KEY`) debe ser la **completa**, incluyendo los headers `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`
- Para otros clientes (Client B, etc.), configura sus respectivos secrets en sus environments correspondientes

### 7.6. Actualizar el Workflow para Usar el Environment

El workflow `deploy-client-a.yml` ya está configurado para usar el environment `heladitos`. Cada job tiene configurado:

```yaml
jobs:
  deploy_backend:
    runs-on: ubuntu-latest
    environment: heladitos  # <-- Ya configurado
    steps:
      # ... resto del workflow
  
  deploy_frontend:
    runs-on: ubuntu-latest
    environment: heladitos  # <-- Ya configurado
    steps:
      # ... resto del workflow
```

**Nota:** El nombre del environment debe coincidir exactamente con el que creaste en GitHub: `heladitos`

### 7.7. Verificar que el Workflow Esté Activo

El workflow `deploy-client-a.yml` está configurado y listo. Puedes probarlo manualmente desde **Actions → Deploy to Client A → Run workflow**.

**📋 Resumen de Environments y Workflows:**

| Cliente | Environment | Workflow | Dominio |
|---------|-------------|----------|---------|
| Hela Ditos | `heladitos` | `deploy-client-a.yml` | hela-ditos.com.ar |
| La Enrique | `enriqueta` | `deploy-client-b.yml` | laenriquetabar.com.ar |
| Heroe del Whisky | `heroe` | `deploy.yml` (u otro) | heroedelwhisky.com.ar |

Cada environment tiene sus propios secrets configurados en GitHub.

---

## 8. Configurar SSL

### 8.1. En CyberPanel

1. Ve a **SSL → Issue SSL**
2. Selecciona los siguientes dominios:
   - `hela-ditos.com.ar`
   - `www.hela-ditos.com.ar`
   - `api.hela-ditos.com.ar`
3. Elige **Let's Encrypt**
4. Clic en **Issue**
5. Espera a que se genere el certificado (puede tardar unos minutos)

### 8.2. Verificar SSL

```bash
# Verificar frontend
curl -I https://hela-ditos.com.ar

# Verificar backend
curl -I https://api.hela-ditos.com.ar/up
```

---

## 9. Verificación Final

### 9.1. Verificar Frontend

```bash
# Desde tu navegador
https://hela-ditos.com.ar

# O desde terminal
curl -I https://hela-ditos.com.ar
```

### 9.2. Verificar Backend

```bash
# Health check endpoint
curl -I https://api.hela-ditos.com.ar/up

# Debe devolver HTTP 200
```

### 9.3. Verificar Logs

```bash
# Ver logs de Laravel
tail -f /home/api.hela-ditos.com.ar/public_html/apps/backend/storage/logs/laravel.log
```

### 9.4. Probar CI/CD

1. En GitHub: **Actions → Deploy to Client A** (o Client B)
2. Haz clic en **Run workflow**
3. Selecciona la rama `master`
4. Ejecuta el workflow
5. Verifica que se complete exitosamente

---

## 10. Troubleshooting

### 10.0. ⚠️ Aclaración: Dos Claves SSH Diferentes

Es importante entender que hay **DOS claves SSH diferentes** con propósitos distintos:

1. **Clave SSH para Clonar Repo** (Sección 3.2):
   - **Propósito**: Permitir que el VPS clone el repositorio desde GitHub
   - **Ubicación**: Se guarda en GitHub → **Settings → SSH and GPG keys** (clave **PÚBLICA**)
   - **Archivo en VPS**: `~/.ssh/id_ed25519` (clave privada) y `~/.ssh/id_ed25519.pub` (clave pública)
   - **Uso**: `git clone git@github.com:...`

2. **Clave SSH para CI/CD** (Sección 7.3):
   - **Propósito**: Permitir que GitHub Actions se conecte al VPS para hacer deployment
   - **Ubicación**: Se guarda en GitHub → **Settings → Environments → [tu-env] → Secrets** (clave **PRIVADA**)
   - **Archivo en VPS**: `~/.ssh/github_actions_deploy` (clave privada) y `~/.ssh/github_actions_deploy.pub` (clave pública)
   - **Uso**: GitHub Actions se conecta al VPS usando esta clave

**NO confundas estas dos claves.** Cada una tiene su propósito específico.

### 10.1. Error: "Permission denied (publickey)" en CI/CD

**Solución:**
- Verifica que la clave privada esté completa en GitHub Environment Secrets (incluye headers)
- Verifica que la clave pública (`github_actions_deploy.pub`) esté en `~/.ssh/authorized_keys` del VPS
- Verifica permisos: `chmod 600 ~/.ssh/authorized_keys`
- Verifica que el workflow use `environment: nombre-del-environment` correcto

### 10.2. Error: "git pull" falla en CI/CD

**Solución:**
```bash
# En el VPS, configurar Git
cd /home/api.hela-ditos.com.ar/public_html
git config --global --add safe.directory /home/api.hela-ditos.com.ar/public_html
```

### 10.3. Error de CORS

**Solución:**
```bash
# Verificar que FRONTEND_URL esté configurado en .env
grep FRONTEND_URL /home/api.hela-ditos.com.ar/public_html/apps/backend/.env

# Limpiar cache de configuración
cd /home/api.hela-ditos.com.ar/public_html/apps/backend
php artisan config:clear
php artisan config:cache
```

### 10.4. Error 500 en Backend

**Solución:**
```bash
# Verificar permisos
chmod -R 775 /home/api.hela-ditos.com.ar/public_html/apps/backend/storage
chmod -R 775 /home/api.hela-ditos.com.ar/public_html/apps/backend/bootstrap/cache
chown -R www-data:www-data /home/api.hela-ditos.com.ar/public_html/apps/backend/storage
chown -R www-data:www-data /home/api.hela-ditos.com.ar/public_html/apps/backend/bootstrap/cache

# Ver logs
tail -50 /home/api.hela-ditos.com.ar/public_html/apps/backend/storage/logs/laravel.log
```

### 10.5. Frontend no Carga

**Solución:**
```bash
# Verificar que los archivos estén en el directorio correcto
ls -la /home/hela-ditos.com.ar/public_html/

# Verificar permisos
chmod -R 755 /home/hela-ditos.com.ar/public_html/
chown -R www-data:www-data /home/hela-ditos.com.ar/public_html/
```

### 10.6. Build del Frontend Falla en CI/CD

**Solución:**
- Verifica que `VITE_API_URL` esté correctamente configurado en GitHub Secrets
- Verifica que las dependencias nativas estén instaladas (ya se instalan automáticamente en el workflow)

---

## 📋 Checklist Final

Marca cada paso completado:

### VPS Setup
- [ ] Sistema actualizado
- [ ] Node.js 20 instalado (vía NVM)
- [ ] Composer instalado
- [ ] PHP 8.1+ instalado

### Dominios
- [ ] Sitio `hela-ditos.com.ar` creado en CyberPanel
- [ ] Sitio `api.hela-ditos.com.ar` creado en CyberPanel
- [ ] Document Root del backend configurado a `apps/backend/public`

### Backend
- [ ] Repositorio clonado
- [ ] Composer dependencies instaladas
- [ ] `.env` configurado con `FRONTEND_URL`
- [ ] Base de datos creada
- [ ] Migraciones ejecutadas
- [ ] Seeders ejecutados
- [ ] Permisos de storage configurados
- [ ] Storage symlink creado

### Frontend
- [ ] Dependencias instaladas
- [ ] `.env.production` configurado
- [ ] Build completado
- [ ] Archivos copiados a directorio público

### CI/CD
- [ ] Clave SSH generada
- [ ] Clave pública autorizada en VPS
- [ ] Todos los secrets configurados en GitHub
- [ ] Workflow probado exitosamente

### SSL
- [ ] SSL configurado para `hela-ditos.com.ar`
- [ ] SSL configurado para `api.hela-ditos.com.ar`
- [ ] Certificados verificados

### Verificación
- [ ] Frontend accesible en `https://hela-ditos.com.ar`
- [ ] Backend accesible en `https://api.hela-ditos.com.ar/up`
- [ ] CI/CD ejecutado exitosamente
- [ ] Sin errores en logs

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu CI/CD estará funcionando. Cada vez que hagas push a `master` (o ejecutes manualmente el workflow), el sistema se desplegará automáticamente.

**Para deployment manual desde GitHub Actions:**
1. Ve a **Actions**
2. Selecciona **Deploy to Client A** (o Client B)
3. Haz clic en **Run workflow**
4. Ejecuta el workflow

**Para deployment automático:**
- Edita `.github/workflows/deploy-client-a.yml` (o `deploy-client-b.yml`)
- Descomenta las líneas del trigger `push`:
  ```yaml
  on:
    push:
      branches: [ master ]
  ```
- Ahora cada push a `master` disparará el deployment automáticamente

---

## 📞 Soporte Adicional

- [Guía Multi-Cliente Completa](./MULTI_CLIENT_DEPLOYMENT.md)
- [Quick Start 2 Clientes](./QUICK_START_2_CLIENTES.md)
- [Documentación de Deployment](./DEPLOYMENT.md)

