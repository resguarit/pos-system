# 🔐 Autenticación con GitHub en el VPS

GitHub ya no acepta contraseñas para operaciones Git. Necesitas usar un **Personal Access Token** o **claves SSH**.

## 🔑 Opción 1: Personal Access Token (Rápido)

### Paso 1: Crear Token en GitHub

1. Ve a GitHub.com y loguéate
2. Haz clic en tu avatar → **Settings**
3. En el menú lateral: **Developer settings**
4. **Personal access tokens → Tokens (classic)**
5. Haz clic en **Generate new token (classic)**
6. Dale un nombre: `VPS-POS-System`
7. Selecciona permisos:
   - ✅ **repo** (Full control of private repositories)
8. Haz clic en **Generate token**
9. **⚠️ COPIA EL TOKEN INMEDIATAMENTE** (solo se muestra una vez)

### Paso 2: Usar el Token

```bash
cd /home/api.hela-ditos.com.ar/public_html
rm -rf * .* 2>/dev/null || true

# Clonar usando el token (reemplaza TU_TOKEN con el token real)
git clone https://TU_TOKEN@github.com/resguarit/pos-system.git .
```

**Ejemplo:**
```bash
git clone https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/resguarit/pos-system.git .
```

### ⚠️ Importante sobre Tokens

- El token se guarda en la URL, así que ten cuidado
- Considera usar SSH después para mayor seguridad
- Si quieres evitar escribir el token cada vez, puedes usar:

```bash
# Configurar credenciales (se guardan en memoria)
git config --global credential.helper store
# La primera vez te pedirá usuario y token
git clone https://github.com/resguarit/pos-system.git .
```

---

## 🔐 Opción 2: Claves SSH (Más Seguro)

### Paso 1: Generar Clave SSH en el VPS

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "vps-pos-system-hela-ditos"

# Presiona Enter para usar ubicación por defecto
# Presiona Enter para contraseña vacía (o pon una segura)
```

### Paso 2: Ver la Clave Pública

```bash
cat ~/.ssh/id_ed25519.pub
```

Copiarás algo como:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... vps-pos-system-hela-ditos
```

### Paso 3: Agregar Clave en GitHub

1. Ve a GitHub.com
2. **Settings → SSH and GPG keys**
3. Haz clic en **New SSH key**
4. **Title:** `VPS POS System - Hela Ditos`
5. **Key:** Pega la clave pública completa
6. Haz clic en **Add SSH key**

### Paso 4: Verificar Conexión SSH

```bash
# Probar conexión SSH a GitHub
ssh -T git@github.com

# Deberías ver: "Hi resguarit! You've successfully authenticated..."
```

### Paso 5: Clonar Repositorio

```bash
cd /home/api.hela-ditos.com.ar/public_html
rm -rf * .* 2>/dev/null || true

# Clonar usando SSH
git clone git@github.com:resguarit/pos-system.git .
```

---

## 🔄 Para el Segundo Cliente

Si vas a usar SSH, puedes usar la misma clave o generar una nueva:

**Opción A: Reutilizar la misma clave**
```bash
# Ya está configurada, solo clonar en el segundo cliente
cd /home/api.laenriquetabar.com.ar/public_html
rm -rf * .* 2>/dev/null || true
git clone git@github.com:resguarit/pos-system.git .
```

**Opción B: Clave separada**
```bash
# Generar nueva clave para el segundo cliente
ssh-keygen -t ed25519 -C "vps-pos-system-laenriquetabar" -f ~/.ssh/id_ed25519_laenriquetabar
cat ~/.ssh/id_ed25519_laenriquetabar.pub
# Agregar en GitHub y usar:
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_laenriquetabar" git clone git@github.com:resguarit/pos-system.git .
```

---

## 🆘 Troubleshooting

### Error: "Permission denied (publickey)"

- Verifica que la clave pública esté agregada en GitHub
- Verifica que estés usando SSH: `git@github.com:` no `https://github.com/`
- Prueba: `ssh -T git@github.com`

### Error: "Invalid username or token"

- Verifica que el token tenga permisos `repo`
- Asegúrate de copiar el token completo
- Verifica que el token no haya expirado

### Error: "Authentication failed"

**Para HTTPS:**
- Usa el token directamente en la URL
- O configura credenciales: `git config credential.helper store`

**Para SSH:**
- Verifica la clave: `cat ~/.ssh/id_ed25519.pub`
- Verifica en GitHub que la clave esté agregada
- Prueba conexión: `ssh -T git@github.com`

---

## 💡 Recomendación

**Para uso inmediato:** Usa Personal Access Token (Opción 1)  
**Para largo plazo:** Configura SSH (Opción 2) - más seguro y no expira

