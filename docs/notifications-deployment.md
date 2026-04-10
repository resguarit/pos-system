# Guía de despliegue de notificaciones

Esta guia cubre el despliegue y la validacion de notificaciones de envios:

- Notificaciones en tiempo real con la app abierta (Laravel Broadcast + Reverb self-hosted)
- Notificaciones push con app en segundo plano o cerrada (Web Push + Service Worker)

## 1) Variables de entorno requeridas

### Backend (`apps/backend/.env`)

```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database

REVERB_APP_ID=pos-system
REVERB_APP_KEY=pos-system-key
REVERB_APP_SECRET=pos-system-secret
REVERB_HOST=tu-dominio.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_SERVER_PATH=

VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
VAPID_SUBJECT=mailto:soporte@tu-dominio.com
```

### Frontend (`apps/frontend/.env.production`)

```env
VITE_API_URL=https://api.tu-dominio.com/api

VITE_REVERB_APP_KEY=pos-system-key
VITE_REVERB_HOST=tu-dominio.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key
```

## 2) Generar claves VAPID

```bash
cd apps/backend
php artisan notifications:vapid
```

Copiá las claves generadas al `.env` del backend y la pública al `.env` del frontend.

## 3) Validar configuración

```bash
cd apps/backend
php artisan notifications:check
```

Resultado esperado: todos los checks en `OK` y rutas requeridas presentes.

## 4) Base de datos y cola

```bash
cd apps/backend
php artisan migrate --force
php artisan queue:work --queue=default --tries=3
php artisan reverb:start --host=0.0.0.0 --port=8080
```

En produccion, ejecuta `queue:work` y `reverb:start` con un administrador de procesos (Supervisor/systemd).

## 5) Matriz funcional mínima

### Caso A: pestaña abierta
- Abrir `/dashboard/envios`
- Crear un envío nuevo
- Esperado: toast + sonido + refresco de tabla

### Caso B: pestaña en segundo plano
- Dejar pestaña abierta pero sin foco
- Crear un envío nuevo
- Esperado: notificación del sistema/navegador

### Caso C: navegador cerrado
- Cerrar navegador
- Crear un envío nuevo
- Esperado: aparece notificación push

### Caso D: click en notificación
- Hacer click en la notificación
- Esperado: se abre la app y navega a `/dashboard/envios`

### Caso E: limpieza de endpoint inválido
- Expirar/eliminar una suscripción push del navegador
- Crear un envío nuevo
- Esperado: backend elimina endpoint inválido (404/410) sin error visible para usuario

## 6) Limitaciones Safari/iOS

- Safari macOS: soporta push con permiso otorgado.
- Safari iOS: mas restrictivo; recomendado usar app instalada (Agregar a pantalla de inicio).
- Si el permiso está denegado, queda fallback realtime en pestañas abiertas.

## 7) Política operativa (recomendado)

- Alcance: notificar por suscripciones de sucursales autorizadas para el usuario.
- Anti-ruido: deduplicar eventos del mismo envio en ventana corta (ya aplicado en UI).
- Fallback: si push no está disponible, mantener realtime y señal visual en app.
- Guion de soporte:
  1. verificar permiso de notificaciones en navegador
  2. desactivar/activar push desde la UI
  3. re-login si el token expiró
  4. verificar estado del worker de cola

## Documentos relacionados

- Matriz QA: `docs/notifications-qa-matrix.md`
- Política operativa: `docs/notifications-ops-policy.md`
