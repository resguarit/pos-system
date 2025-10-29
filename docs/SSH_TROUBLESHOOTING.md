# 🔧 Troubleshooting SSH con GitHub

## Problema: "no pasa nada" al agregar clave SSH

### Verificar si la clave ya está agregada

1. En GitHub → Settings → SSH and GPG keys
2. Busca si ya existe una clave con ese fingerprint o contenido similar
3. Si existe, prueba conectarte de nuevo

### Regenerar clave SIN passphrase (más fácil)

Si sigue sin funcionar, genera una nueva clave **sin contraseña**:

```bash
# Eliminar clave actual
rm ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub

# Generar nueva SIN contraseña (presiona Enter cuando pida passphrase)
ssh-keygen -t ed25519 -C "vps-pos-system" -N ""

# Ver la nueva clave
cat ~/.ssh/id_ed25519.pub
```

**Nota:** `-N ""` significa "sin contraseña"

### Verificar formato de la clave

La clave debe tener exactamente este formato (3 partes separadas por espacios):
```
ssh-ed25519 [clave_larga] [comentario]
```

Asegúrate de copiar:
- La línea completa
- Sin espacios extras al inicio o final
- Sin saltos de línea

### Pasos para agregar en GitHub

1. Ve a: https://github.com/settings/keys
2. Click "New SSH key"
3. **Title:** `VPS POS System`
4. **Key type:** Debe estar en "Authentication Key"
5. **Key:** Pega la clave COMPLETA (una sola línea)
6. Click "Add SSH key"

### Verificar que se agregó correctamente

Después de agregar:

```bash
# Probar conexión
ssh -T git@github.com

# Si funciona, verás:
# Hi naimguar! You've successfully authenticated, but GitHub does not provide shell access.
```

### Si sigue sin funcionar

**Opción alternativa: Usar Personal Access Token (más rápido)**

```bash
# 1. Crear token en GitHub:
# Settings → Developer settings → Personal access tokens → Generate new token
# Marcar "repo" y generar

# 2. Clonar con token:
cd /home/api.hela-ditos.com.ar/public_html
rm -rf * .* 2>/dev/null || true
git clone https://TU_TOKEN@github.com/resguarit/pos-system.git .
```

Reemplaza `TU_TOKEN` con el token que generaste.

---

## Problema: Permission denied en storage/logs/laravel.log

### Error común

```
The stream or file "/path/to/storage/logs/laravel.log" could not be opened in append mode: 
Failed to open stream: Permission denied
```

Este error ocurre cuando el usuario del servidor web (nginx, apache, php-fpm) no tiene permisos para escribir en los directorios de storage.

### Solución rápida: Usar el script automatizado

Desde tu máquina local, ejecuta:

```bash
# Desde la raíz del proyecto
./scripts/fix-storage-permissions.sh
```

El script:
- Detecta automáticamente el usuario del servidor web
- Configura los permisos correctos (775 para directorios, 664 para archivos)
- Establece el ownership correcto
- Verifica que todo funcione

### Solución manual: SSH al servidor

Si el script no funciona, puedes ejecutar estos comandos manualmente:

```bash
# Conectarse al servidor
ssh -p 5507 posdeployer@149.50.138.145

# Ir al directorio del backend
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Detectar usuario del servidor web
WEB_USER=$(ps aux | grep -E '(nginx|apache|php-fpm)' | grep -v grep | head -1 | awk '{print $1}')
echo "Usuario detectado: $WEB_USER"

# Crear directorios necesarios
mkdir -p storage/logs
mkdir -p storage/framework/{cache,sessions,views}
mkdir -p bootstrap/cache

# Eliminar log con permisos incorrectos
sudo rm -f storage/logs/laravel.log

# Configurar permisos
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache
sudo chown -R $WEB_USER:$WEB_USER storage
sudo chown -R $WEB_USER:$WEB_USER bootstrap/cache

# Crear archivo de log con permisos correctos
sudo touch storage/logs/laravel.log
sudo chmod 664 storage/logs/laravel.log
sudo chown $WEB_USER:$WEB_USER storage/logs/laravel.log

# Verificar
ls -ld storage storage/logs storage/logs/laravel.log
```

### Verificar que funciona

Después de ejecutar los comandos, prueba hacer una petición a la API. Si el error persiste, verifica:

1. **Usuario del servidor web correcto:**
   ```bash
   ps aux | grep -E '(nginx|apache|php-fpm)' | grep -v grep
   ```

2. **Permisos actuales:**
   ```bash
   ls -la storage/logs/
   ```

3. **SELinux (si está habilitado):**
   ```bash
   # En sistemas con SELinux, puede necesitar:
   sudo setenforce 0  # Temporalmente deshabilitar
   # O configurar contexto:
   sudo chcon -R -t httpd_sys_rw_content_t storage/
   ```

### Prevenir el problema

Asegúrate de que el script `fix-storage-permissions.sh` se ejecute después de cada deployment. Puedes agregarlo al final de tu script de deployment.

