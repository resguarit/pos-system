# Solución para Git que Pide Usuario/Contraseña con SSH

## Problema
Git está pidiendo usuario/contraseña de GitHub aunque el remote esté configurado como SSH.

## Causa
Puede haber configuraciones de Git que fuerzan HTTPS o cache de credenciales.

## Solución Completa

```bash
ssh root@200.58.127.86

cd /home/api.hela-ditos.com.ar/public_html

# 1. Verificar configuración actual
git remote -v
git config --list | grep -E "(url|credential)"

# 2. Asegurar que el remote esté en SSH
git remote set-url origin git@github.com:resguarit/pos-system.git

# 3. Limpiar cualquier configuración de credenciales
git config --global --unset credential.helper 2>/dev/null || true
git config --local --unset credential.helper 2>/dev/null || true

# 4. Forzar que Git use SSH para GitHub
git config --global url."git@github.com:".insteadOf "https://github.com/"

# 5. Limpiar cache de credenciales
rm -rf ~/.git-credentials 2>/dev/null || true

# 6. Verificar configuración SSH
ls -la ~/.ssh/
cat ~/.ssh/id_ed25519.pub

# 7. Probar conexión SSH a GitHub
ssh -T git@github.com
# Debería responder: "Hi resguarit! You've successfully authenticated..."

# 8. Si todo está bien, hacer pull
git pull origin master
```

## Si SSH no funciona

Si el paso 7 falla, necesitas configurar la clave SSH:

```bash
# Verificar que existe la clave
ls -la ~/.ssh/id_ed25519

# Si no existe o no está configurada, seguir instrucciones del SETUP_HELA_DITOS_CI_CD.md
```

