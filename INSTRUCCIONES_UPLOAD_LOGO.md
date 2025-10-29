# 📤 Cómo subir el logo manualmente al servidor

## Opción 1: Usando SCP (desde tu máquina)

```bash
# 1. Subir el archivo al servidor
scp -P 5507 /ruta/local/al/logo.jpg posdeployer@149.50.138.145:/tmp/logo.jpg

# 2. Conectarte al servidor
ssh -p 5507 posdeployer@149.50.138.145

# 3. Mover el archivo a la ubicación correcta
cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
mkdir -p storage/app/public/system/logos
mv /tmp/logo.jpg storage/app/public/system/logos/logo_$(date +%s).jpg

# 4. Configurar permisos
chown apihe4729:apihe4729 storage/app/public/system/logos/*.jpg
chmod 664 storage/app/public/system/logos/*.jpg

# 5. Obtener el nombre del archivo
LOGO_FILE=$(ls -t storage/app/public/system/logos/*.jpg | head -1)
LOGO_NAME=$(basename "$LOGO_FILE")
LOGO_URL="/storage/system/logos/$LOGO_NAME"

# 6. Guardar en la base de datos
php artisan tinker --execute="\App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode('$LOGO_URL')]);"

# 7. Verificar
echo "✅ Logo configurado: https://api.heroedelwhisky.com.ar$LOGO_URL"
```

## Opción 2: Subir directamente vía FTP/SFTP

1. Conectarte al servidor usando FileZilla, Cyberduck, o similar
2. Subir el logo a: `/home/api.heroedelwhisky.com.ar/public_html/apps/backend/storage/app/public/system/logos/`
3. Luego conectar por SSH y ejecutar los pasos 4, 5 y 6 de arriba

## Opción 3: Subir desde el servidor (si ya tienes el archivo ahí)

```bash
# Conectarte al servidor
ssh -p 5507 posdeployer@149.50.138.145

cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend

# Si el archivo está en /tmp
mkdir -p storage/app/public/system/logos
mv /tmp/tu_logo.jpg storage/app/public/system/logos/logo_$(date +%s).jpg

# Configurar permisos
chown apihe4729:apihe4729 storage/app/public/system/logos/*.jpg
chmod 664 storage/app/public/system/logos/*.jpg

# Obtener URL
LOGO_FILE=$(ls -t storage/app/public/system/logos/*.jpg | head -1)
LOGO_NAME=$(basename "$LOGO_FILE")
LOGO_URL="/storage/system/logos/$LOGO_NAME"

# Guardar en BD
php artisan tinker --execute="\App\Models\Setting::updateOrCreate(['key' => 'logo_url'], ['value' => json_encode('$LOGO_URL')]);"

echo "✅ Logo: https://api.heroedelwhisky.com.ar$LOGO_URL"
```

## Verificar que funciona

```bash
# Ver el logo en el navegador
curl -I https://api.heroedelwhisky.com.ar/storage/system/logos/TU_LOGO.jpg

# Debe retornar 200 OK
```

## Notas importantes

- **Formato**: El logo debe ser JPG, PNG o GIF
- **Tamaño**: Recomendado máximo 2MB
- **Nombre**: El nombre del archivo no importa, pero debe tener extensión válida
- **Permisos**: Debe pertenecer al usuario `apihe4729`
- **URL en BD**: Se guarda como JSON encoded, ej: `"/storage/system/logos/logo_1234567890.jpg"`

