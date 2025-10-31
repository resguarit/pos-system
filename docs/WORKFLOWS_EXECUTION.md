# 🚀 Guía de Ejecución de Workflows - Multi-Cliente

Esta guía explica cómo se ejecutan los workflows para cada cliente y cómo configurarlos.

## 📋 Workflows Actuales

### 1. Deploy to Client A (`deploy-client-a.yml`)
**Cliente**: Hela Ditos  
**Environment**: `heladitos`  
**Dominio**: hela-ditos.com.ar

**Modo de Ejecución**:
- ✅ **Automático**: Se ejecuta cuando haces `push` a `master`
- ✅ **Manual**: También disponible vía workflow_dispatch

**Cómo ejecutar**:

**Automático**:
- Simplemente haz `git push origin master`
- El workflow se ejecutará automáticamente para desplegar a Hela Ditos

**Manual**:
1. Ve a **Actions → Deploy to Client A**
2. Haz clic en **Run workflow**
3. Selecciona la rama `master`
4. Opcional: Marca `force` si quieres forzar deployment
5. Haz clic en **Run workflow**

**Secrets usados** (desde environment `heladitos`):
- `CLIENT_A_VPS_HOST`
- `CLIENT_A_VPS_PORT`
- `CLIENT_A_VPS_USERNAME`
- `CLIENT_A_VPS_SSH_KEY`
- `CLIENT_A_BACKEND_DEPLOY_PATH`
- `CLIENT_A_FRONTEND_DEPLOY_PATH`
- `CLIENT_A_API_URL`

---

### 2. Deploy to Client B (`deploy-client-b.yml`)
**Cliente**: La Enrique Tabar  
**Environment**: `enriqueta`  
**Dominio**: laenriquetabar.com.ar

**Modo de Ejecución**:
- ⚠️ **Solo Manual** (workflow_dispatch)
- Los triggers automáticos están **deshabilitados** (comentados)

**Cómo ejecutar**:
1. Ve a **Actions → Deploy to Client B**
2. Haz clic en **Run workflow**
3. Selecciona la rama `master`
4. Opcional: Marca `force` si quieres forzar deployment
5. Haz clic en **Run workflow**

**Secrets usados** (desde environment `enriqueta`):
- `CLIENT_B_VPS_HOST`
- `CLIENT_B_VPS_PORT`
- `CLIENT_B_VPS_USERNAME`
- `CLIENT_B_VPS_SSH_KEY`
- `CLIENT_B_BACKEND_DEPLOY_PATH`
- `CLIENT_B_FRONTEND_DEPLOY_PATH`
- `CLIENT_B_API_URL`

---

### 3. Deploy POS System (`deploy.yml`)
**Cliente**: Heroe del Whisky  
**Environment**: ❌ **NO CONFIGURADO** (usa secrets del repositorio)  
**Dominio**: heroedelwhisky.com.ar

**Modo de Ejecución**:
- ✅ **Automático**: Se ejecuta cuando haces `push` a `master`
- ✅ **Manual**: También disponible vía workflow_dispatch

**Cómo ejecutar**:

**Automático**:
- Simplemente haz `git push origin master`
- El workflow se ejecutará automáticamente

**Manual**:
1. Ve a **Actions → Deploy POS System**
2. Haz clic en **Run workflow**
3. Selecciona la rama `master`
4. Opcional: Desmarca `deploy_frontend` o `deploy_backend` si solo quieres deployar uno
5. Haz clic en **Run workflow**

**Secrets usados** (desde **Repository Secrets**, NO desde environment):
- `VPS_HOST`
- `VPS_PORT`
- `VPS_USERNAME`
- `VPS_SSH_KEY`
- `FRONTEND_DEPLOY_PATH`
- `BACKEND_DEPLOY_PATH`

**⚠️ Nota**: Este workflow usa scripts residentes en el servidor (`~/deploy-frontend.sh` y `~/deploy-backend.sh`), NO ejecuta comandos directamente en el workflow.

---

## 🔄 Comparación de métodos

| Aspecto | Client A/B (heladitos/enriqueta) | Heroe (deploy.yml) |
|---------|----------------------------------|-------------------|
| **Environment** | ✅ Sí (usa environments) | ❌ No (usa repository secrets) |
| **Ejecución** | Manual solamente | Automática + Manual |
| **Build Frontend** | ✅ En GitHub Actions | ❌ En VPS (script remoto) |
| **Deploy Backend** | ✅ Directo en workflow | ❌ Via script remoto |
| **Secrets** | Environment-specific | Repository-wide |

---

## 🎯 Opciones de Configuración

### Opción A: Mantener Actual (Recomendado para Multi-Cliente)

**Ventajas**:
- ✅ Hela Ditos y Heroe se despliegan automáticamente con cada push
- ✅ La Enrique sigue siendo manual (control total)
- ✅ Cada cliente tiene sus propios secrets aislados
- ✅ Puedes probar cambios en producción antes de desplegar a todos

**Desventajas**:
- ⚠️ Hela Ditos recibirá actualizaciones automáticas (verifica que esté listo)
- ⚠️ Si hay un error, afectará automáticamente a Hela Ditos

**Ideal para**: Producción multi-cliente donde cada cliente puede tener diferentes versiones.

---

### Opción B: Habilitar Deployment Automático por Cliente

Si quieres que se ejecuten automáticamente cuando hay cambios:

#### Para Client A (heladitos):

Edita `.github/workflows/deploy-client-a.yml`:

```yaml
on:
  push:
    branches: [ master ]
    paths:
      - 'apps/backend/**'
      - 'apps/frontend/**'
      - '.github/workflows/deploy-client-a.yml'
  workflow_dispatch:
    # ... resto igual
```

#### Para Client B (enriqueta):

Edita `.github/workflows/deploy-client-b.yml`:

```yaml
on:
  push:
    branches: [ master ]
    paths:
      - 'apps/backend/**'
      - 'apps/frontend/**'
      - '.github/workflows/deploy-client-b.yml'
  workflow_dispatch:
    # ... resto igual
```

**⚠️ Consideración**: Con esto, cada push a master desplegará a TODOS los clientes automáticamente. Asegúrate de que todos estén listos para recibir actualizaciones.

---

### Opción C: Deployment Selectivo por Path

Para desplegar solo cuando cambian archivos específicos:

```yaml
on:
  push:
    branches: [ master ]
    paths:
      - 'apps/backend/**'  # Solo despliega si hay cambios en backend
  workflow_dispatch:
```

O para frontend solamente:

```yaml
on:
  push:
    branches: [ master ]
    paths:
      - 'apps/frontend/**'  # Solo despliega si hay cambios en frontend
  workflow_dispatch:
```

---

### Opción D: Actualizar `deploy.yml` para Usar Environment

Si quieres que Heroe del Whisky también use environments:

Edita `.github/workflows/deploy.yml`:

```yaml
jobs:
  deploy_frontend:
    if: ${{ github.event.inputs.deploy_frontend != 'false' }}
    runs-on: ubuntu-latest
    environment: heroe  # <-- Agregar esta línea
    
  deploy_backend:
    if: ${{ github.event.inputs.deploy_backend != 'false' }}
    runs-on: ubuntu-latest
    environment: heroe  # <-- Agregar esta línea
```

Luego mueve los secrets de Repository Secrets al environment `heroe`.

---

## 🎬 Flujo de Ejecución Actual

### Escenario 1: Cambios en el Código (Push a Master)

```
git push origin master
    │
    ├─→ deploy.yml (Heroe) ✅ SE EJECUTA AUTOMÁTICAMENTE
    │
    ├─→ deploy-client-a.yml (Hela Ditos) ✅ SE EJECUTA AUTOMÁTICAMENTE
    │
    └─→ deploy-client-b.yml (La Enrique) ❌ NO SE EJECUTA (manual)
```

### Escenario 2: Deployment Manual de un Cliente

```
GitHub Actions → Deploy to Client A → Run workflow
    │
    └─→ deploy-client-a.yml ✅ SE EJECUTA
        ├─→ Usa environment: heladitos
        ├─→ Despliega backend
        └─→ Despliega frontend
```

---

## 📊 Resumen de Ejecución

| Workflow | Trigger Automático | Trigger Manual | Environment |
|----------|-------------------|----------------|-------------|
| **deploy-client-a.yml** | ✅ Push a master | ✅ workflow_dispatch | `heladitos` |
| **deploy-client-b.yml** | ❌ Deshabilitado | ✅ workflow_dispatch | `enriqueta` |
| **deploy.yml** | ✅ Push a master | ✅ workflow_dispatch | ❌ Repository secrets |

---

## 🔧 Recomendaciones

### Para Desarrollo Continuo (Configuración Actual):
- ✅ `deploy.yml` (Heroe) con auto-deployment
- ✅ `deploy-client-a.yml` (Hela Ditos) con auto-deployment
- ⚠️ `deploy-client-b.yml` (La Enrique) con deployment manual
- Esto permite actualizar automáticamente Heroe y Hela Ditos, mientras mantienes control manual sobre La Enrique

### Para Deployment Uniforme:
- Habilita auto-deployment para todos
- Todos los clientes recibirán actualizaciones automáticamente
- Más riesgo pero más fácil de mantener

### Para Control Total:
- Mantén todo manual
- Ejecutas cada deployment cuando estés seguro
- Máximo control, más trabajo manual

---

## 🆘 Troubleshooting

### ¿Por qué no se ejecuta automáticamente?
- Verifica que los triggers `push` no estén comentados
- Verifica que estés haciendo push a la rama `master`
- Verifica que los paths coincidan con los archivos modificados

### ¿Cómo ver qué secrets se están usando?
- Los workflows de Client A/B usan secrets del environment (heladitos/enriqueta)
- El workflow deploy.yml usa secrets del repositorio (Settings → Secrets → Actions)

### ¿Cómo forzar ejecución de todos?
1. Ejecuta manualmente cada workflow desde GitHub Actions
2. O habilita los triggers automáticos en cada workflow

