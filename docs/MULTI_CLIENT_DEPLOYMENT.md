# 🚀 Guía de Deployment Multi-Cliente usando CyberPanel Git

Esta guía explica cómo desplegar el mismo sistema POS a múltiples clientes en diferentes dominios usando la funcionalidad Git de CyberPanel.

## 📋 Prerrequisitos

- VPS con CyberPanel instalado
- Acceso al panel de CyberPanel
- Dominios configurados en CyberPanel (ej: `hela-ditos.com.ar`, `laenriquetabar.com.ar`)
- Repositorio Git configurado (GitHub, GitLab, etc.)
- Credenciales de acceso SSH al repositorio (si es privado)

## 🔍 Verificación: ¿Qué está hardcodeado?

Antes de comenzar, asegúrate de que el sistema esté listo para múltiples clientes:

### ✅ Cambios Realizados

1. **CORS configurable**: El archivo `apps/backend/config/cors.php` ahora usa la variable de entorno `FRONTEND_URL`
2. **Frontend sin hardcodeo**: Los archivos `systemConfig.ts` y `app-sidebar.tsx` ahora usan `window.location.origin` como fallback
3. **Logo configurable**: El logo se configura desde la base de datos, no está hardcodeado

### ⚠️ Configuraciones por Cliente

Cada cliente necesitará configurar en su `.env` del backend:
- `FRONTEND_URL`: URL del dominio del frontend (ej: `https://hela-ditos.com.ar`)
- `APP_URL`: URL del backend API (ej: `https://api.hela-ditos.com.ar`)
- Variables de base de datos (DB_DATABASE, DB_USERNAME, DB_PASSWORD)

## 🛠️ Configuración Paso a Paso

### Paso 1: Preparar el Repositorio

1. Asegúrate de que todos los cambios estén en el repositorio Git
2. Verifica que la rama `master` (o `main`) esté actualizada

### Paso 2: Configurar Dominio en CyberPanel

Para cada cliente, necesitarás dos dominios:
- **Frontend**: `cliente.com.ar` (o `www.cliente.com.ar`)
- **Backend API**: `api.cliente.com.ar`

#### En CyberPanel:

**Recomendación: Usar Sitio Separado** (como en producción actual)

1. Ve a **Websites → Create Website**
2. Crea el sitio para el frontend: `cliente.com.ar`
3. Crea el sitio para el backend: `api.cliente.com.ar` (como sitio separado, NO como subdominio)

**Nota:** Aunque CyberPanel permite crear `api.cliente.com.ar` como subdominio, es recomendable crearlo como **sitio separado** para mantener consistencia con la configuración actual que ya funciona en producción. Ver [guía completa](./CYBERPANEL_SUBDOMAIN_VS_SITE.md) para más detalles.

### Paso 3: Configurar Git para el Backend (API)

El backend necesita tener el repositorio completo porque contiene tanto frontend como backend.

#### Opción A: Usar "Init Repo" (Primera vez)

1. En CyberPanel, ve a **Version Management → Manage Git**
2. Selecciona el dominio `api.cliente.com.ar`
3. Selecciona la carpeta: `/home/api.cliente.com.ar/public_html`
4. Haz clic en **"Init Repo"** si es la primera vez
5. Luego ve a la sección **"Attach Existing Repo"** o configura el remote manualmente

#### Opción B: Conectar Repositorio Existente (Recomendado)

**Via SSH:**

```bash
# Conectarte al VPS
ssh usuario@vps-ip

# Ir al directorio del backend
cd /home/api.cliente.com.ar/public_html

# Si ya existe contenido, hacer backup
mv public_html public_html.backup 2>/dev/null || true

# Clonar el repositorio
git clone https://github.com/tu-usuario/pos-system.git .

# O si es privado, usar SSH:
git clone git@github.com:tu-usuario/pos-system.git .
```

**Via CyberPanel Git UI:**

1. En **Manage Git** para `api.cliente.com.ar`
2. Selecciona `/home/api.cliente.com.ar/public_html`
3. Haz clic en **"Attach Existing Repo"**
4. Ingresa:
   - **Repository URL**: `https://github.com/tu-usuario/pos-system.git` (o SSH)
   - **Branch**: `master` (o `main`)
   - Credenciales si es necesario

### Paso 4: Configurar Backend Laravel

```bash
cd /home/api.cliente.com.ar/public_html/apps/backend

# Instalar dependencias
composer install --no-dev --optimize-autoloader

# Copiar archivo de entorno
cp .env.example .env

# Generar key de aplicación
php artisan key:generate
```

**Editar `.env` del backend:**

```env
APP_NAME="POS System - Cliente"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.cliente.com.ar

# IMPORTANTE: Configurar FRONTEND_URL para CORS
FRONTEND_URL=https://cliente.com.ar

# Base de datos
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cliente_pos_db
DB_USERNAME=cliente_db_user
DB_PASSWORD=contraseña_segura

# Cache y Sesiones
CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

### Paso 5: Configurar Base de Datos

```bash
# Crear base de datos y usuario (en MySQL)
mysql -u root -p

CREATE DATABASE cliente_pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cliente_db_user'@'localhost' IDENTIFIED BY 'contraseña_segura';
GRANT ALL PRIVILEGES ON cliente_pos_db.* TO 'cliente_db_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Ejecutar migraciones
cd /home/api.cliente.com.ar/public_html/apps/backend
php artisan migrate --force
php artisan db:seed
```

### Paso 6: Configurar Permisos y Storage

```bash
cd /home/api.cliente.com.ar/public_html/apps/backend

# Crear directorios de storage
mkdir -p storage/app/public/system/logos
mkdir -p storage/app/public/system/favicons

# Configurar permisos
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Crear symlink para storage público
php artisan storage:link
```

### Paso 7: Compilar y Desplegar Frontend

#### Opción A: Build en el VPS (Recomendado para CyberPanel Git)

```bash
# Instalar Node.js si no está instalado (CyberPanel puede tenerlo)
# Verificar versión de Node
node --version  # Debe ser 18+

# Si no está instalado:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Ir al directorio del frontend
cd /home/api.cliente.com.ar/public_html/apps/frontend

# Instalar dependencias
npm install --force

# Instalar dependencias nativas (si es necesario)
npm install @rollup/rollup-linux-x64-gnu --save-optional
npm install @swc/core-linux-x64-gnu --save-optional
npm install lightningcss-linux-x64-gnu --save-optional
npm install @tailwindcss/oxide-linux-x64-gnu --save-optional

# Crear archivo .env.production
cat > .env.production << EOF
VITE_API_URL=https://api.cliente.com.ar/api
VITE_APP_ENV=production
EOF

# Compilar
npm run build

# Copiar archivos compilados al directorio público del frontend
cp -r dist/* /home/cliente.com.ar/public_html/
```

#### Opción B: Build Local y Subir

```bash
# En tu máquina local
cd apps/frontend
cp .env.example .env.production

# Editar .env.production
VITE_API_URL=https://api.cliente.com.ar/api
VITE_APP_ENV=production

# Compilar
npm run build

# Subir al servidor
scp -r dist/* usuario@vps-ip:/home/cliente.com.ar/public_html/
```

### Paso 8: Configurar Nginx/LiteSpeed (CyberPanel)

CyberPanel generalmente configura esto automáticamente, pero verifica:

**Frontend** (`/home/cliente.com.ar/public_html`):
- Debe servir archivos estáticos
- Debe tener regla para SPA: `try_files $uri $uri/ /index.html;`

**Backend** (`/home/api.cliente.com.ar/public_html/apps/backend/public`):
- Debe apuntar al directorio `public` de Laravel
- Debe tener soporte PHP-FPM configurado

Puedes verificar/editar esto en CyberPanel: **Websites → List Websites → [Dominio] → Manage**

### Paso 9: Configurar SSL

En CyberPanel:

1. Ve a **SSL → Issue SSL**
2. Selecciona ambos dominios:
   - `cliente.com.ar`
   - `www.cliente.com.ar`
   - `api.cliente.com.ar`
3. Elige Let's Encrypt
4. Espera a que se genere el certificado

### Paso 10: Verificar Deployment

```bash
# Verificar frontend
curl -I https://cliente.com.ar

# Verificar backend
curl -I https://api.cliente.com.ar/up

# Ver logs de Laravel
tail -f /home/api.cliente.com.ar/public_html/apps/backend/storage/logs/laravel.log
```

## 🔄 Actualizaciones Futuras

### Usando Git de CyberPanel

1. En CyberPanel, ve a **Version Management → Manage Git**
2. Selecciona `api.cliente.com.ar`
3. Selecciona `/home/api.cliente.com.ar/public_html`
4. Haz clic en **"Pull Latest Changes"** o similar
5. Luego ejecuta:

```bash
cd /home/api.cliente.com.ar/public_html/apps/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Si hay cambios en frontend
cd ../frontend
npm install --force
npm run build
cp -r dist/* /home/cliente.com.ar/public_html/
```

### Usando SSH (Más Control)

```bash
ssh usuario@vps-ip
cd /home/api.cliente.com.ar/public_html
git pull origin master

# Backend
cd apps/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../frontend
npm install --force
npm run build
cp -r dist/* /home/cliente.com.ar/public_html/
```

## 📝 Checklist para Nuevo Cliente

- [ ] Crear dominios en CyberPanel (frontend y api)
- [ ] Clonar repositorio en `/home/api.cliente.com.ar/public_html`
- [ ] Configurar `.env` del backend con:
  - [ ] `APP_URL`
  - [ ] `FRONTEND_URL` (importante para CORS)
  - [ ] Credenciales de base de datos
- [ ] Crear base de datos y usuario
- [ ] Ejecutar migraciones y seeders
- [ ] Configurar permisos de storage
- [ ] Compilar frontend con `VITE_API_URL` correcto
- [ ] Copiar `dist/` al directorio público del frontend
- [ ] Configurar SSL para ambos dominios
- [ ] Verificar que todo funcione
- [ ] Subir logo personalizado (opcional)

## 🔐 Seguridad

1. **`.env` no debe estar en Git**: Asegúrate de que `.env` esté en `.gitignore`
2. **Permisos**: Storage debe tener permisos `775` y ser propiedad de `www-data`
3. **SSL**: Siempre usar HTTPS en producción
4. **Backups**: Configurar backups regulares de la base de datos

## 🐛 Troubleshooting

### Error de CORS
- Verifica que `FRONTEND_URL` en el `.env` del backend sea correcto
- Limpia cache: `php artisan config:clear`

### Frontend no carga
- Verifica que `dist/` esté en el directorio correcto
- Verifica permisos del directorio público
- Revisa logs de Nginx/LiteSpeed

### Backend no responde
- Verifica que el documento root apunte a `apps/backend/public`
- Revisa logs de Laravel: `storage/logs/laravel.log`
- Verifica permisos de `storage/` y `bootstrap/cache/`

### Problemas con Git en CyberPanel
- Si CyberPanel Git no funciona, usa SSH directamente
- Asegúrate de que las credenciales de Git estén correctas

## 📚 Recursos Adicionales

- [Documentación CyberPanel](https://cyberpanel.net/docs/)
- [Documentación Laravel Deployment](https://laravel.com/docs/deployment)
- [Documentación Vite Production](https://vitejs.dev/guide/build.html)

