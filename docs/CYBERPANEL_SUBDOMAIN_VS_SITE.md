# 🏗️ Subdominio vs Sitio Separado en CyberPanel

## 📋 Diferencia Técnica

### Opción A: Sitio Separado (VPS Viejo)
```
/home/api.heroedelwhisky.com.ar/public_html/
├── apps/
│   ├── backend/
│   │   └── public/  ← Document root aquí
│   └── frontend/
└── ...
```

**Configuración en CyberPanel:**
- Creas un sitio completamente nuevo: `api.heroedelwhisky.com.ar`
- Document root: `/home/api.heroedelwhisky.com.ar/public_html/apps/backend/public`

### Opción B: Subdominio (Nuevo VPS)
```
/home/heroedelwhisky.com.ar/
├── public_html/           ← Dominio principal
│   └── ... (puede estar vacío o tener frontend)
└── api/                  ← Subdominio en CyberPanel
    └── public_html/      ← O esta estructura
        └── apps/
            └── backend/
                └── public/
```

**Configuración en CyberPanel:**
- Agregas subdominio `api` al sitio `heroedelwhisky.com.ar`
- Document root debe apuntar a: `/home/heroedelwhisky.com.ar/api/public_html/apps/backend/public`
- **O** estructuras alternativas que CyberPanel puede crear

## ⚠️ Lo Importante (No hay problema técnico)

**El código NO depende de si es sitio separado o subdominio**. Solo importa:

1. ✅ **Estructura de directorios correcta**
   - El código Laravel debe estar en: `[cualquier_ruta]/apps/backend/`
   - El document root del servidor web debe apuntar a: `[cualquier_ruta]/apps/backend/public`

2. ✅ **Configuración del servidor web**
   - El virtual host debe apuntar al directorio `public/` de Laravel
   - Los permisos deben ser correctos

3. ✅ **Rutas en los scripts**
   - Solo necesitas ajustar las rutas en los scripts de deployment
   - Las rutas están en variables de entorno o configurables

## 🔧 Configuración Correcta para Subdominio

### Estructura Recomendada con Subdominio

Si CyberPanel crea el subdominio en una estructura como:
```
/home/heroedelwhisky.com.ar/api/public_html/
```

Entonces puedes hacer dos cosas:

#### Opción 1: Clonar repo completo en el subdominio
```bash
cd /home/heroedelwhisky.com.ar/api/public_html
git clone <repo-url> .

# Estructura resultante:
# /home/heroedelwhisky.com.ar/api/public_html/
# ├── apps/
# │   ├── backend/
# │   │   └── public/  ← Document root aquí
# │   └── frontend/
# └── ...
```

**En CyberPanel → Websites → Manage → api.heroedelwhisky.com.ar:**
- Document root: `/home/heroedelwhisky.com.ar/api/public_html/apps/backend/public`

#### Opción 2: Crear estructura separada
```bash
# Crear directorio para el repo
mkdir -p /home/heroedelwhisky.com.ar/repos
cd /home/heroedelwhisky.com.ar/repos
git clone <repo-url> pos-system

# Crear symlink o configurar document root
# En CyberPanel, apuntar document root a:
# /home/heroedelwhisky.com.ar/repos/pos-system/apps/backend/public
```

## 📝 Ajustes Necesarios en Scripts

Si cambias de estructura, solo necesitas ajustar las variables de entorno:

**En lugar de:**
```bash
BACKEND_DEPLOY_PATH=/home/api.heroedelwhisky.com.ar/public_html
```

**Usarías:**
```bash
BACKEND_DEPLOY_PATH=/home/heroedelwhisky.com.ar/api/public_html
# O la ruta que CyberPanel cree para el subdominio
```

## ✅ Ventajas de Usar Subdominio

1. **Más organizado**: Todo bajo un solo dominio principal
2. **Más fácil de gestionar**: Menos sitios separados en CyberPanel
3. **Mismo resultado final**: Funciona exactamente igual

## ⚡ Pasos para Configurar Subdominio

1. **En CyberPanel:**
   - Ve a **Websites → List Websites**
   - Selecciona `heroedelwhisky.com.ar`
   - Haz clic en **"Create Subdomain"**
   - Subdomain name: `api`
   - Esto creará: `api.heroedelwhisky.com.ar`

2. **Verificar estructura creada:**
   ```bash
   ls -la /home/heroedelwhisky.com.ar/
   # Verás algo como: api/, public_html/, etc.
   ```

3. **Clonar repositorio:**
   ```bash
   cd /home/heroedelwhisky.com.ar/api/public_html
   # O la ruta que CyberPanel haya creado
   git clone <repo-url> .
   ```

4. **Configurar document root en CyberPanel:**
   - **Websites → Manage → api.heroedelwhisky.com.ar**
   - Document root debe ser: `[ruta_completa]/apps/backend/public`
   - Ejemplo: `/home/heroedelwhisky.com.ar/api/public_html/apps/backend/public`

5. **Configurar PHP version:**
   - Asegúrate de que use PHP 8.1+

## 🔍 Verificación

```bash
# Ver estructura creada
ls -la /home/heroedelwhisky.com.ar/

# Verificar document root configurado
# En CyberPanel o revisando configuración de Nginx/LiteSpeed

# Probar que Laravel funciona
curl -I https://api.heroedelwhisky.com.ar/up
```

## ⚠️ Nota Importante

**CyberPanel puede crear subdominios en diferentes estructuras dependiendo de la versión:**

- Algunas versiones crean: `/home/dominio.com/subdominio/public_html/`
- Otras crean: `/home/dominio.com/public_html/subdominio/`
- O simplemente: `/home/subdominio.dominio.com/public_html/`

**Lo importante es:**
1. Verificar dónde CyberPanel creó el directorio del subdominio
2. Ajustar la ruta en los scripts según corresponda
3. Asegurarte de que el document root apunte a `apps/backend/public`

## 🎯 Conclusión

**No hay problema en usar subdominio en lugar de sitio separado.** Funciona igual de bien. Solo necesitas:

1. ✅ Ajustar las rutas en los scripts de deployment
2. ✅ Verificar que el document root apunte correctamente
3. ✅ Mantener la misma estructura interna (`apps/backend/public`)

El código de Laravel y la aplicación son completamente independientes de cómo CyberPanel organiza los directorios.

## 💡 Recomendación

**Ambas opciones funcionan perfectamente.** La elección es principalmente por preferencia:

- **Sitio Separado** (usado actualmente en producción): 
  - ✅ Más aislado y organizado
  - ✅ Más fácil de gestionar permisos independientes
  - ✅ Estructura más clara para múltiples clientes
  
- **Subdominio**:
  - ✅ Menos sitios en el panel de CyberPanel
  - ✅ Todo bajo un dominio principal

**Sugerencia:** Mantén la misma estructura que ya funciona en producción (sitio separado) para mantener consistencia entre todos los clientes.

