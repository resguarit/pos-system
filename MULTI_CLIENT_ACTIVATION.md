# 🎯 Multi-Client Deployment - Activation Guide

## ⚠️ Estado Actual: DISABLED

Los workflows de despliegue multi-cliente están actualmente **deshabilitados** para evitar despliegues automáticos no deseados.

## ✅ Cómo Activar

Cuando necesites activar el despliegue multi-cliente, sigue estos pasos:

### 1. Editar Workflows

Edita los siguientes archivos y descomenta las líneas que dicen `# push:`:

**`.github/workflows/deploy-client-a.yml`**
```yaml
on:
  push:
    branches: [ master ]
    paths: [ 'apps/backend/**' ]
  workflow_dispatch:
```

**`.github/workflows/deploy-client-b.yml`**
```yaml
on:
  push:
    branches: [ master ]
    paths: [ 'apps/backend/**' ]
  workflow_dispatch:
```

### 2. Configurar GitHub Secrets

Ve a **Settings → Secrets and variables → Actions** y agrega los secrets necesarios:

```
CLIENT_A_VPS_HOST=<ip_vps_a>
CLIENT_A_VPS_PORT=22
CLIENT_A_VPS_USERNAME=posdeployer
CLIENT_A_VPS_SSH_KEY=<llave_privada_ssh>
CLIENT_A_BACKEND_DEPLOY_PATH=/home/api.cliente-a.com/public_html
CLIENT_A_FRONTEND_DEPLOY_PATH=/home/cliente-a.com/public_html
CLIENT_A_API_URL=https://api.cliente-a.com/api

CLIENT_B_VPS_HOST=<ip_vps_b>
CLIENT_B_VPS_PORT=22
CLIENT_B_VPS_USERNAME=posdeployer
CLIENT_B_VPS_SSH_KEY=<llave_privada_ssh>
CLIENT_B_BACKEND_DEPLOY_PATH=/home/api.cliente-b.com/public_html
CLIENT_B_FRONTEND_DEPLOY_PATH=/home/cliente-b.com/public_html
CLIENT_B_API_URL=https://api.cliente-b.com/api
```

### 3. Setup en cada VPS

Sigue las instrucciones en `MULTI_CLIENT_SETUP_QUICK.md`

## 🚀 Uso Mientras Está Disabled

Incluso con el trigger de `push` deshabilitado, puedes ejecutar los workflows manualmente:

1. Ve a **GitHub → Actions**
2. Selecciona el workflow que necesites (Client A o Client B)
3. Haz clic en **Run workflow**
4. Selecciona la rama `master`
5. Haz clic en **Run workflow**

## 📚 Documentación

- `MULTI_CLIENT_SETUP_QUICK.md` - Guía rápida de configuración
- `MULTI_CLIENT_DEPLOYMENT.md` - Documentación completa
- `DEPLOYMENT_COMPARISON.md` - Comparación con despliegue actual

---

**Nota**: Estos workflows están listos para usar cuando los necesites. Solo descomenta las líneas indicadas y configura los secrets en GitHub.
