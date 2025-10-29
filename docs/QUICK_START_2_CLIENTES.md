# 🚀 Guía Rápida: Deployment de 2 Clientes

Esta es una guía práctica paso a paso para subir el sistema POS a **2 clientes nuevos** en el mismo VPS.

## 📋 Clientes a Configurar

Según las imágenes, los dominios son:
- **Cliente 1**: `hela-ditos.com.ar`
- **Cliente 2**: `laenriquetabar.com.ar`

## ✅ Prerrequisitos

- ✅ Código actualizado sin hardcodeo (ya hecho)
- ✅ VPS con CyberPanel configurado
- ✅ Acceso SSH al VPS
- ✅ Repositorio Git listo
- ✅ Dominios configurados en CyberPanel

## 🎯 Pasos para Cada Cliente

### Cliente 1: hela-ditos.com.ar

#### Paso 1: Crear Sitios en CyberPanel

1. **Frontend:**
   - Ve a **Websites → Create Website**
   - Domain: `hela-ditos.com.ar`
   - Esto creará: `/home/hela-ditos.com.ar/public_html/`

2. **Backend (API):**
   - Ve a **Websites → Create Website**
   - Domain: `api.hela-ditos.com.ar`
   - Esto creará: `/home/api.hela-ditos.com.ar/public_html/`

#### Paso 2: Clonar Repositorio en el Backend

**Primero, obtén las credenciales SSH:**

En CyberPanel, para encontrar información de SSH:

1. **Ver IP del servidor:** Ya la tienes en el Dashboard (IP: 200.58.127.86)
2. **Usuario SSH:** Generalmente es `root` o el usuario que configuraste al instalar CyberPanel
3. **Puerto SSH:** Por defecto es `22`, pero puede ser diferente
4. **Acceso SSH:**
   - Ve a **Server Management → SSH Access** en CyberPanel
   - O usa el usuario `root` con la contraseña del servidor/root

**Conectarse por SSH:**

Basándote en la configuración que encontraste en **Security → Secure SSH**:

```bash
# Con el puerto configurado (ej: 5614 según tu configuración)
ssh -p 5614 root@200.58.127.86
```

**⚠️ IMPORTANTE - Si Root Login está deshabilitado:**

Si en **Security → Secure SSH** ves que "PERMIT ROOT LOGIN" está en **OFF**:

1. **Opción 1 (Recomendada): Habilitar root login temporalmente**
   - Ve a **Security → Secure SSH**
   - Activa el toggle "PERMIT ROOT LOGIN"
   - Guarda cambios
   - Luego conéctate: `ssh -p 5614 root@200.58.127.86`

2. **Opción 2: Usar otro usuario**
   - Si tienes otro usuario con sudo, úsalo:
   ```bash
   ssh -p 5614 otro_usuario@200.58.127.86
   ```

**Si no tienes la contraseña:**
- Puedes resetearla desde CyberPanel: **Server Management → Change Password**
- O si tienes acceso al servidor físicamente, puedes cambiar la contraseña de root

Una vez conectado:

```bash
# Ir al directorio del backend del cliente 1
cd /home/api.hela-ditos.com.ar/public_html

# Limpiar directorio si tiene contenido
rm -rf * .* 2>/dev/null || true

# ⚠️ IMPORTANTE: GitHub requiere autenticación
# Opción 1: Usar Personal Access Token (más rápido)
# 1. Crear token en GitHub: Settings → Developer settings → Personal access tokens → Generate new token
# 2. Marcar permisos "repo"
# 3. Usar el token así:
git clone https://TU_TOKEN_AQUI@github.com/resguarit/pos-system.git .

# Opción 2: Configurar SSH (más seguro)
# 1. Generar clave: ssh-keygen -t ed25519 -C "vps-pos"
# 2. Ver clave pública: cat ~/.ssh/id_ed25519.pub
# 3. Agregar en GitHub: Settings → SSH and GPG keys → New SSH key
# 4. Luego clonar:
# git clone git@github.com:resguarit/pos-system.git .
```

#### Paso 3: Configurar Backend Laravel

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend

# Solucionar warning de Git (si aparece)
git config --global --add safe.directory /home/api.hela-ditos.com.ar/public_html

# Instalar dependencias de Composer
composer install --no-dev --optimize-autoloader

# Crear archivo .env (si no existe .env.example, crear desde cero)
if [ -f .env.example ]; then
    cp .env.example .env
else
    # Crear .env básico desde cero
    php artisan env:clone
    # O crear manualmente si el comando anterior no existe
fi

# Generar key de aplicación
php artisan key:generate
```

#### Paso 4: Configurar Archivo .env

Editar `/home/api.hela-ditos.com.ar/public_html/apps/backend/.env`:

```env
APP_NAME="POS System - Hela Ditos"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.hela-ditos.com.ar

# ⚠️ IMPORTANTE: Para CORS
FRONTEND_URL=https://hela-ditos.com.ar

# Base de datos
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=hela_ditos_pos
DB_USERNAME=hela_ditos_user
DB_PASSWORD=TU_CONTRASEÑA_SEGURA_AQUI

# Cache y Sesiones
CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

#### Paso 5: Crear Base de Datos

```bash
mysql -u root -p
```

En MySQL:
```sql
CREATE DATABASE hela_ditos_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hela_ditos_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON hela_ditos_pos.* TO 'hela_ditos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Paso 6: Ejecutar Migraciones

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend
php artisan migrate --force
php artisan db:seed
```

#### Paso 7: Configurar Permisos y Storage

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend

# Crear directorios de storage
mkdir -p storage/app/public/system/logos
mkdir -p storage/app/public/system/favicons

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

#### Paso 8: Configurar Document Root en CyberPanel

1. Ve a **Websites → List Websites**
2. Selecciona **`api.hela-ditos.com.ar`**
3. Haz clic en **Manage**
4. Verifica/Configura:
   - **Document Root**: `/home/api.hela-ditos.com.ar/public_html/apps/backend/public`
   - **PHP Version**: 8.1 o superior

#### Paso 9: Compilar y Subir Frontend

```bash
# Ir al directorio del frontend
cd /home/api.hela-ditos.com.ar/public_html/apps/frontend

# Instalar dependencias
npm install --force

# Si tienes problemas con dependencias nativas:
npm install @rollup/rollup-linux-x64-gnu --save-optional
npm install @swc/core-linux-x64-gnu --save-optional
npm install lightningcss-linux-x64-gnu --save-optional
npm install @tailwindcss/oxide-linux-x64-gnu --save-optional

# Crear archivo de entorno para producción
cat > .env.production << EOF
VITE_API_URL=https://api.hela-ditos.com.ar/api
VITE_APP_ENV=production
EOF

# Compilar
npm run build

# Copiar archivos compilados al directorio público del frontend
cp -r dist/* /home/hela-ditos.com.ar/public_html/
```

#### Paso 10: Configurar SSL

1. En CyberPanel: **SSL → Issue SSL**
2. Selecciona ambos dominios:
   - `hela-ditos.com.ar`
   - `www.hela-ditos.com.ar`
   - `api.hela-ditos.com.ar`
3. Elige **Let's Encrypt**
4. Espera a que se genere el certificado

#### Paso 11: Verificar

```bash
# Verificar frontend
curl -I https://hela-ditos.com.ar

# Verificar backend
curl -I https://api.hela-ditos.com.ar/up

# Ver logs si hay problemas
tail -f /home/api.hela-ditos.com.ar/public_html/apps/backend/storage/logs/laravel.log
```

---

### Cliente 2: laenriquetabar.com.ar

**Repite los mismos pasos pero con estos valores:**

#### Configuración .env del Backend:

```env
APP_NAME="POS System - La Enrique Tabar"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.laenriquetabar.com.ar

# ⚠️ IMPORTANTE: Para CORS
FRONTEND_URL=https://laenriquetabar.com.ar

# Base de datos
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=laenriquetabar_pos
DB_USERNAME=laenriquetabar_user
DB_PASSWORD=TU_CONTRASEÑA_SEGURA_AQUI
```

#### Base de Datos:

```sql
CREATE DATABASE laenriquetabar_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'laenriquetabar_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON laenriquetabar_pos.* TO 'laenriquetabar_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Frontend .env.production:

```env
VITE_API_URL=https://api.laenriquetabar.com.ar/api
VITE_APP_ENV=production
```

#### Rutas de Directorios:

- Frontend: `/home/laenriquetabar.com.ar/public_html/`
- Backend: `/home/api.laenriquetabar.com.ar/public_html/`
- Document Root API: `/home/api.laenriquetabar.com.ar/public_html/apps/backend/public`

---

## 🎯 Script Rápido (Cliente 1 - Ejemplo)

Puedes crear un script para automatizar parte del proceso:

```bash
#!/bin/bash
# deploy-cliente-1.sh

CLIENTE="hela-ditos"
DOMINIO_FRONTEND="hela-ditos.com.ar"
DOMINIO_API="api.hela-ditos.com.ar"
DB_NAME="hela_ditos_pos"
DB_USER="hela_ditos_user"
DB_PASS="CAMBIAR_CONTRASEÑA"

echo "🚀 Iniciando deployment para $CLIENTE..."

# 1. Backend: Clonar repo
cd /home/$DOMINIO_API/public_html
git clone https://github.com/tu-usuario/pos-system.git .

# 2. Backend: Instalar dependencias
cd apps/backend
composer install --no-dev --optimize-autoloader

# 3. Backend: Configurar .env
cp .env.example .env
php artisan key:generate

# 4. Backend: Configurar .env (necesitas editar manualmente DB_PASSWORD)
sed -i "s|APP_NAME=.*|APP_NAME=\"POS System - $CLIENTE\"|" .env
sed -i "s|APP_URL=.*|APP_URL=https://$DOMINIO_API|" .env
echo "FRONTEND_URL=https://$DOMINIO_FRONTEND" >> .env

# 5. Crear base de datos (requiere contraseña MySQL)
mysql -u root -p << EOF
CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# 6. Ejecutar migraciones
php artisan migrate --force
php artisan db:seed

# 7. Permisos
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
php artisan storage:link

# 8. Cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 9. Frontend: Compilar
cd ../frontend
npm install --force
echo "VITE_API_URL=https://$DOMINIO_API/api" > .env.production
npm run build

# 10. Copiar frontend
cp -r dist/* /home/$DOMINIO_FRONTEND/public_html/

echo "✅ Deployment completado para $CLIENTE"
echo "⚠️ Recuerda:"
echo "   1. Configurar SSL en CyberPanel"
echo "   2. Verificar document root en CyberPanel"
echo "   3. Cambiar contraseña de DB en el script"
```

## 📋 Checklist Final

Para cada cliente verifica:

- [ ] Sitios creados en CyberPanel (frontend y api)
- [ ] Repositorio clonado en el backend
- [ ] `.env` configurado correctamente con `FRONTEND_URL`
- [ ] Base de datos creada y configurada
- [ ] Migraciones ejecutadas
- [ ] Permisos de storage configurados
- [ ] Document root apunta a `apps/backend/public`
- [ ] Frontend compilado y copiado
- [ ] SSL configurado para todos los dominios
- [ ] Verificado que todo funciona (frontend y backend)

## 🔍 Verificación Rápida

```bash
# Cliente 1
curl -I https://hela-ditos.com.ar
curl -I https://api.hela-ditos.com.ar/up

# Cliente 2
curl -I https://laenriquetabar.com.ar
curl -I https://api.laenriquetabar.com.ar/up
```

## 🐛 Troubleshooting Común

### Error 500 en Backend
- Verifica permisos: `chmod -R 775 storage bootstrap/cache`
- Verifica logs: `tail -f storage/logs/laravel.log`
- Limpia cache: `php artisan config:clear && php artisan cache:clear`

### Error de CORS
- Verifica que `FRONTEND_URL` esté correcto en el `.env`
- Limpia cache: `php artisan config:clear && php artisan config:cache`

### Frontend no carga
- Verifica que `dist/` esté en el directorio correcto
- Verifica permisos del directorio público

### Error de Base de Datos
- Verifica credenciales en `.env`
- Verifica que el usuario tenga permisos: `SHOW GRANTS FOR 'usuario'@'localhost';`

## 📞 Soporte

Si tienes problemas, consulta:
- [Guía Completa Multi-Cliente](./MULTI_CLIENT_DEPLOYMENT.md)
- [Migración Heroe del Whisky](./MIGRATION_HEROE_WHISKY.md) (para referencia de la estructura)
- Logs de Laravel: `storage/logs/laravel.log`

