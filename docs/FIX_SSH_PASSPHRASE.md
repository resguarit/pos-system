# Solución para Passphrase de Clave SSH en VPS

## Problema
La clave SSH en el VPS tiene passphrase y el script no puede ingresarla automáticamente.

## Opción 1: Generar Nueva Clave Sin Passphrase (Recomendado)

```bash
ssh root@200.58.127.86

# 1. Generar nueva clave SSH sin passphrase
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_deploy -N ""

# 2. Copiar la clave pública para agregarla a GitHub
cat ~/.ssh/id_ed25519_deploy.pub
# Copia TODO el output, debería verse así:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... root@vps-5413099-x

# 3. Agregar la clave pública a GitHub
# Ve a: https://github.com/settings/keys
# Click en "New SSH key"
# Title: "VPS Hela Ditos - Deployment"
# Key: Pega la clave pública copiada
# Click "Add SSH key"

# 4. Configurar SSH para usar esta clave para GitHub
cat >> ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_deploy
    IdentitiesOnly yes
EOF

# 5. Verificar que funciona
chmod 600 ~/.ssh/config
ssh -T git@github.com
# Debería responder: "Hi resguarit! You've successfully authenticated..."

# 6. Actualizar scripts
cd /home/api.hela-ditos.com.ar/public_html
git pull origin master
cp scripts/deploy-backend-heladitos.sh ~/
cp scripts/deploy-frontend-heladitos.sh ~/
chmod +x ~/deploy-backend-heladitos.sh ~/deploy-frontend-heladitos.sh
```

## Opción 2: Eliminar Passphrase de Clave Existente

Si recuerdas la passphrase actual:

```bash
ssh root@200.58.127.86

# Eliminar la passphrase
ssh-keygen -p -f ~/.ssh/id_ed25519
# Enter old passphrase: [ingresa la passphrase actual]
# Enter new passphrase (empty for no passphrase): [presiona ENTER]
# Enter same passphrase again: [presiona ENTER]
```

## Recomendación

**Usa la Opción 1** porque:
- ✅ No necesitas recordar la passphrase actual
- ✅ La clave es específica para deployment (más seguro)
- ✅ Puedes mantener la clave original con passphrase para acceso manual
- ✅ Es más fácil de mantener y depurar

