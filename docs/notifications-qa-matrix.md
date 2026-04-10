# Matriz QA de notificaciones

Usar esta matriz antes de cada despliegue a produccion que toque notificaciones de envios.

## Precondiciones

- Backend con `BROADCAST_CONNECTION=reverb` y credenciales Reverb validas.
- Backend con claves VAPID validas y `VAPID_SUBJECT` definido.
- Worker de cola ejecutandose.
- Frontend build con `VITE_REVERB_*` y `VITE_VAPID_PUBLIC_KEY` validos.
- HTTPS habilitado.

## Escenarios

| ID | Escenario | Dispositivo/Navegador | Resultado esperado | Estado |
|---|---|---|---|---|
| A | App abierta en `/dashboard/envios` | Chrome Desktop | Toast + sonido + refresco de tabla | Pendiente |
| B | App en segundo plano | Chrome Desktop | Se muestra notificacion del sistema | Pendiente |
| C | Navegador cerrado | Chrome Desktop | Llega notificacion push | Pendiente |
| D | Click en notificacion | Chrome Desktop | Abre app y navega a `/dashboard/envios` | Pendiente |
| E | Suscripcion invalida/expirada | Chrome Desktop | Endpoint se elimina en backend sin error visible | Pendiente |
| F | App abierta en `/dashboard/envios` | Safari macOS | Toast + sonido + refresco | Pendiente |
| G | Notificacion en background | Safari macOS | Notificacion del sistema con permiso otorgado | Pendiente |
| H | Push en app instalada | Safari iOS (Agregar a inicio) | Llega notificacion push | Pendiente |

## Evidencia a guardar

- Captura del permiso de notificaciones aceptado.
- Captura o video de cada escenario probado.
- Logs backend de dispatch de evento y procesamiento de cola.
- Confirmacion de limpieza de endpoint muerto (404/410).
