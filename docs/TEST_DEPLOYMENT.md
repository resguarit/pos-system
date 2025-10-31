# Guía de Prueba de Auto-Deployment - Hela Ditos

## 1. Verificar Secrets en GitHub

Antes de hacer el primer push, verifica que todos los secrets estén configurados:

### 1.1. Ir a GitHub Environments

1. Ve a tu repositorio: `https://github.com/resguarit/pos-system`
2. **Settings → Environments → heladitos**
3. Verifica que existan estos secrets:

| Secret Name | Valor Esperado | Descripción |
|------------|----------------|-------------|
| `CLIENT_A_VPS_HOST` | `200.58.127.86` | IP del VPS |
| `CLIENT_A_VPS_PORT` | `22` | Puerto SSH |
| `CLIENT_A_VPS_USERNAME` | `root` | Usuario SSH |
| `CLIENT_A_VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Clave privada SSH |
| `CLIENT_A_BACKEND_DEPLOY_PATH` | `/home/api.hela-ditos.com.ar/public_html` | Ruta del backend |
| `CLIENT_A_FRONTEND_DEPLOY_PATH` | `/home/hela-ditos.com.ar/public_html` | Ruta del frontend |
| `CLIENT_A_API_URL` | `https://api.hela-ditos.com.ar` | URL de la API |

### 1.2. Obtener la Clave SSH Privada

En el VPS de Hela Ditos:

```bash
cat ~/.ssh/id_ed25519
```

Copia TODO el contenido (incluye `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`) y pégalo en `CLIENT_A_VPS_SSH_KEY`.

---

## 2. Cambios Realizados para la Prueba

### 2.1. Cambio en el Frontend

Se agregó un comentario de debug en `apps/frontend/src/pages/dashboard/ConfiguracionPage.tsx`:

```typescript
// Auto-deploy test: v1.0.1-hela-ditos
```

Este comentario está en el código pero no es visible en la interfaz.

### 2.2. Mejoras en el Workflow

Se agregaron pasos de debug en `.github/workflows/deploy-client-a.yml`:

- ✅ Información del environment y commit
- ✅ Logs detallados de cada paso del deployment
- ✅ Verificación de permisos
- ✅ Lista de archivos desplegados

---

## 3. Ejecutar el Deployment

### 3.1. Commit y Push

```bash
cd /Users/naimguarino/Documents/Resguar\ IT/POS/pos-system

# Ver los cambios
git status

# Agregar los cambios
git add apps/frontend/src/pages/dashboard/ConfiguracionPage.tsx
git add .github/workflows/deploy-client-a.yml
git add docs/TEST_DEPLOYMENT.md

# Hacer commit
git commit -m "feat: Add auto-deploy debug for Hela Ditos v1.0.1

- Added debug comment in ConfiguracionPage
- Enhanced workflow with detailed logging
- Added test deployment guide"

# Push a master (esto disparará el auto-deployment)
git push origin master
```

### 3.2. Monitorear en GitHub Actions

1. Ve a **GitHub → Actions**: `https://github.com/resguarit/pos-system/actions`
2. Verás el workflow **"Deploy to Client A"** ejecutándose automáticamente
3. Haz clic en el workflow para ver los logs en tiempo real

### 3.3. Qué Esperar en los Logs

#### Backend Deployment:
```
🔍 Deployment Environment: heladitos
📦 Trigger: push
🌿 Branch: refs/heads/master
=========================================
🚀 HELA DITOS - Backend Deployment
=========================================
📍 Path: /home/api.hela-ditos.com.ar/public_html
📥 Pulling latest changes...
📦 Installing dependencies...
🗄️ Running migrations...
♻️ Clearing caches...
📋 Caching configurations...
✅ Backend deployment completed successfully!
🌐 API: https://api.hela-ditos.com.ar
```

#### Frontend Deployment:
```
🔍 Deployment Environment: heladitos
🎨 Building Frontend for HELA DITOS
📦 Installing frontend dependencies...
🏗️ Building frontend...
🌐 API URL: https://api.hela-ditos.com.ar
✅ Build completed
🔧 Setting correct permissions...
✅ Permissions set correctly
=========================================
✅ HELA DITOS - Frontend Deployment Completed
=========================================
🌐 Website: https://hela-ditos.com.ar
```

---

## 4. Verificar el Deployment

### 4.1. Backend

```bash
# Health check
curl https://api.hela-ditos.com.ar/up

# Debe responder: 200 OK
```

### 4.2. Frontend

```bash
# Health check
curl -I https://hela-ditos.com.ar

# Debe responder: 200 OK

# Verificar que se desplegó el nuevo build
curl https://hela-ditos.com.ar | grep -o "index-[^.]*\.js"
# El hash debe ser diferente al anterior
```

### 4.3. CORS

```bash
# Verificar CORS
curl -v -X OPTIONS \
  -H "Origin: https://hela-ditos.com.ar" \
  https://api.hela-ditos.com.ar/api/login 2>&1 | grep -i "access-control"

# Debe mostrar:
# < access-control-allow-origin: https://hela-ditos.com.ar
# < access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# < access-control-allow-headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
# < access-control-allow-credentials: true
```

### 4.4. Verificar en el Navegador

1. Abre `https://hela-ditos.com.ar`
2. Refresca con **Cmd+Shift+R** (limpiar cache)
3. Abre **DevTools → Sources**
4. Busca el archivo `ConfiguracionPage` en los sources
5. Deberías ver el comentario: `// Auto-deploy test: v1.0.1-hela-ditos`
6. Intenta hacer login con:
   - Email: `admin@example.com`
   - Password: `admin123`

---

## 5. Solución de Problemas

### 5.1. El Workflow No Se Ejecuta

**Causa**: Los secrets no están configurados correctamente.

**Solución**:
1. Ve a GitHub → Settings → Environments → heladitos
2. Verifica que todos los secrets existan
3. Especialmente `CLIENT_A_VPS_SSH_KEY`

### 5.2. Error de Permisos SSH

**Causa**: La clave SSH no es válida o no tiene permisos.

**Solución**:
```bash
# En el VPS
cat ~/.ssh/id_ed25519
# Copia TODA la clave (incluye BEGIN y END)
# Pégala en CLIENT_A_VPS_SSH_KEY en GitHub
```

### 5.3. Error 500 en el Backend

**Causa**: Problema con migraciones o cache.

**Solución**:
```bash
# En el VPS
cd /home/api.hela-ditos.com.ar/public_html/apps/backend
php artisan config:clear
php artisan cache:clear
php artisan migrate --force
php artisan config:cache
```

### 5.4. CORS Error en el Frontend

**Causa**: Los headers de CORS no se están aplicando.

**Solución**: Ya está configurado en el Virtual Host de LiteSpeed. Verificar:
```bash
curl -I -H "Origin: https://hela-ditos.com.ar" \
  https://api.hela-ditos.com.ar/api/login
```

---

## 6. Próximos Deployments

### 6.1. Deployment Automático

Cada vez que hagas `git push origin master`, el sistema se desplegará automáticamente.

### 6.2. Deployment Manual

1. Ve a GitHub → Actions
2. Selecciona "Deploy to Client A"
3. Click en "Run workflow"
4. Selecciona la rama `master`
5. Click en "Run workflow"

---

## 7. Resumen

✅ **Frontend**: Cambio de debug agregado
✅ **Workflow**: Logs detallados configurados
✅ **CORS**: Funcionando correctamente
✅ **Permisos**: Configurados automáticamente
✅ **Auto-deployment**: Activado en `master`

**¡Listo para hacer push!** 🚀

```bash
git push origin master
```

Luego monitorea en: https://github.com/resguarit/pos-system/actions

