# 🔐 Cómo Obtener Acceso SSH en CyberPanel

Guía para encontrar y usar las credenciales SSH para conectarte al VPS desde CyberPanel.

## 📍 Información Básica

Desde el Dashboard de CyberPanel puedes ver:

- **IP del Servidor:** Visible en el sidebar bajo "OVERVIEW" (ej: `IP: 200.58.127.86`)
- **Actividad SSH:** Botones "Recent SSH Logins" y "Recent SSH Logs" en el Activity Board

## 🔍 Configuración SSH en CyberPanel

Para encontrar la configuración SSH:

1. Ve a **Security → Secure SSH** en el menú lateral
2. Aquí verás:
   - **SSH PORT:** El puerto configurado (ej: `5614`)
   - **PERMIT ROOT LOGIN:** Si está habilitado o no
   - **SSH Keys:** Botón para gestionar claves SSH

## 🔍 Dónde Encontrar Credenciales SSH

### Opción 1: Credenciales de Instalación

Cuando instalaste CyberPanel, configuraste:
- **Usuario:** Generalmente `root`
- **Contraseña:** La contraseña que configuraste para el usuario root
- **Puerto:** Por defecto `22` (SSH estándar)

### Opción 2: Panel de CyberPanel

1. **Verificar Usuario y Cambiar Contraseña:**
   - Ve a **Server Management → Change Password**
   - Aquí puedes cambiar la contraseña del usuario `root`
   - O crear/verificar usuarios adicionales

2. **Verificar Puerto SSH:**
   - Ve a **Server Management → SSH Access**
   - O verifica en el archivo de configuración SSH

3. **Acceso SSH desde CyberPanel:**
   - Algunas versiones de CyberPanel tienen **Server Management → SSH Access** o **Terminal**
   - Puedes usar la terminal web si está disponible

## 🚀 Conectarse por SSH

### Comando Básico

Basándote en la configuración que encontraste en **Security → Secure SSH**:

```bash
# Con el puerto configurado en Secure SSH (ej: 5614)
ssh -p 5614 root@200.58.127.86

# IMPORTANTE: Si "PERMIT ROOT LOGIN" está deshabilitado:
# Opción 1: Habilitarlo temporalmente en Secure SSH
# Opción 2: Usar otro usuario con permisos sudo
```

### ⚠️ Si Root Login está Deshabilitado

Si en **Secure SSH** ves que "PERMIT ROOT LOGIN" está en **OFF**:

**Opción A: Habilitar Root Login (temporalmente)**
1. En **Security → Secure SSH**
2. Activa el toggle de "PERMIT ROOT LOGIN"
3. Haz clic en "Save Changes"
4. Luego conéctate: `ssh -p 5614 root@200.58.127.86`

**Opción B: Usar otro usuario**
```bash
# Si tienes otro usuario con sudo
ssh -p 5614 usuario@200.58.127.86
# Luego puedes usar sudo cuando sea necesario
```

### Primera Conexión

La primera vez te pedirá confirmar el fingerprint:
```
The authenticity of host '200.58.127.86' can't be established.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
```

Ingresa `yes` y luego la contraseña.

### Usando Clave SSH (Más Seguro)

Si tienes una clave SSH configurada:

```bash
ssh -i ~/.ssh/id_rsa root@200.58.127.86
```

## 🔑 Si No Recuerdas la Contraseña

### Opción 1: Resetear desde CyberPanel

1. Ve a **Server Management → Change Password**
2. Selecciona el usuario (`root` generalmente)
3. Ingresa nueva contraseña
4. Guarda

### Opción 2: Desde el VPS (Si tienes acceso físico/VNC)

```bash
# Si estás conectado al servidor
sudo passwd root
```

### Opción 3: Desde el Proveedor de VPS

Si olvidaste completamente las credenciales:
- Accede al panel de tu proveedor VPS (Vultr, DigitalOcean, etc.)
- Usa la consola web/VNC que proporcionan
- Cambia la contraseña desde ahí

## 📝 Información que Necesitas

Para conectarte necesitas:

1. ✅ **IP del Servidor:** `200.58.127.86` (ya la tienes del Dashboard)
2. ✅ **Usuario:** Generalmente `root`
3. ✅ **Contraseña:** La que configuraste al instalar CyberPanel
4. ✅ **Puerto SSH:** Por defecto `22`, pero puede ser diferente

## 🔍 Verificar Puerto SSH

Si no estás seguro del puerto:

### Método 1: Desde CyberPanel
- Ve a **Server Management → SSH Access**
- Debería mostrar la configuración SSH

### Método 2: Probar Puertos Comunes

```bash
# Probar puerto 22 (por defecto)
ssh root@200.58.127.86

# O puertos comunes alternativos
ssh -p 2222 root@200.58.127.86
ssh -p 5507 root@200.58.127.86  # Puerto del VPS anterior
```

### Método 3: Verificar desde el Servidor

Si ya tienes acceso de alguna manera:

```bash
# Ver puerto SSH en el servidor
sudo grep Port /etc/ssh/sshd_config

# Ver estado del servicio SSH
sudo systemctl status sshd
```

## 🛡️ Configuración Segura SSH

Una vez conectado, puedes mejorar la seguridad:

### Deshabilitar Login por Contraseña (Usar solo claves SSH)

```bash
# Editar configuración SSH
sudo nano /etc/ssh/sshd_config

# Cambiar:
PasswordAuthentication no
PermitRootLogin prohibit-password  # o PermitRootLogin no si no usas root

# Reiniciar SSH
sudo systemctl restart sshd
```

### Agregar Tu Clave SSH Pública

```bash
# En tu máquina local, generar clave si no tienes:
ssh-keygen -t rsa -b 4096

# Copiar clave al servidor
ssh-copy-id root@200.58.127.86

# O manualmente:
cat ~/.ssh/id_rsa.pub | ssh root@200.58.127.86 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## ✅ Verificación de Conexión

Una vez conectado, puedes verificar:

```bash
# Ver información del servidor
uname -a
df -h  # Espacio en disco
free -h  # Memoria
whoami  # Usuario actual
pwd  # Directorio actual
```

## 📚 Pasos Siguientes

Una vez conectado por SSH, puedes:

1. Clonar el repositorio para los clientes
2. Configurar Laravel
3. Ejecutar migraciones
4. Compilar frontend
5. Configurar permisos

Ver la guía completa: [QUICK_START_2_CLIENTES.md](./QUICK_START_2_CLIENTES.md)

## 🆘 Troubleshooting

### Error: "Connection refused"
- Verifica que el puerto sea correcto
- Verifica que el servicio SSH esté corriendo: `sudo systemctl status sshd`
- Verifica firewall (UFW): `sudo ufw status`

### Error: "Permission denied"
- Verifica que el usuario y contraseña sean correctos
- Verifica que el usuario tenga permisos SSH

### Error: "Host key verification failed"
```bash
# Limpiar clave conocida
ssh-keygen -R 200.58.127.86
```

### No puedo encontrar las credenciales
- Revisa el email de instalación de CyberPanel
- Contacta con el proveedor del VPS
- Usa la consola VNC del proveedor para resetear

