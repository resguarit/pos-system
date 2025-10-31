# Solución para Git Pull con Cambios Locales - HelaDitos

## Problema
Git detecta cambios locales en los scripts que no están commiteados, bloqueando el `git pull`.

## Solución Rápida

En el VPS, ejecuta:

```bash
cd /home/api.hela-ditos.com.ar/public_html

# Ver qué archivos tienen cambios
git status

# Opción 1: Descartar cambios locales (recomendado si no son importantes)
git checkout -- scripts/deploy-backend-heladitos.sh scripts/deploy-frontend-heladitos.sh

# Opción 2: O hacer stash de los cambios
git stash

# Ahora hacer pull
git pull origin master

# Si usaste stash y quieres recuperar los cambios:
# git stash pop
```

## Después del Pull

Una vez que el pull funcione, actualiza los scripts en el home:

```bash
# Copiar los scripts actualizados
cp scripts/deploy-backend-heladitos.sh ~/
cp scripts/deploy-frontend-heladitos.sh ~/
chmod +x ~/deploy-backend-heladitos.sh ~/deploy-frontend-heladitos.sh

# Verificar que tienen las mejoras
grep -n "Limpiar locks" ~/deploy-frontend-heladitos.sh
grep -n "SSH.*HTTPS" ~/deploy-frontend-heladitos.sh
```

## Verificar que Funciona

```bash
# Verificar que los scripts están en el home
ls -lah ~/deploy-*-heladitos.sh

# Probar el script manualmente (opcional)
~/deploy-backend-heladitos.sh
```

