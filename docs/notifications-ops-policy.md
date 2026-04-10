# Politica operativa de notificaciones

Esta politica define el comportamiento por defecto para notificaciones de envios.

## Alcance

- Notificar a usuarios suscriptos a:
  - canal global (`shipments.global`), y
  - canal por sucursal (`shipments.branch.{branchId}`) donde el usuario tenga acceso.
- Las suscripciones push pueden asociarse a `branch_id` para reducir ruido.

## Control de ruido

- Ventana de deduplicacion en UI: suprime repetidos del mismo envio en un intervalo corto.
- Mensaje breve: priorizar referencia del envio y evitar texto largo.
- Evitar push para cambios internos que no requieran accion del usuario.

## Reglas de fallback

- Si el permiso push esta denegado: mantener realtime en app abierta.
- Si websocket/broadcast falla: push sigue como fallback fuera de app.
- Si ambos no estan disponibles: usar refresh manual y listado de envios.

## Guia de soporte

1. Confirmar permiso de notificaciones en navegador.
2. Pedir desactivar/activar push desde la UI de envios.
3. Verificar que el usuario tenga acceso a la sucursal esperada.
4. Verificar estado del worker de cola.
5. Verificar credenciales Reverb y claves VAPID.
6. Revisar logs backend de `shipment.created` y ejecucion del job push.

## Condicion de salida a produccion

No desplegar cambios de notificaciones si no se cumple:

- Matriz QA escenarios A-E aprobada en Chrome Desktop.
- Al menos una validacion Safari aprobada (macOS y/o iOS con app instalada).
- Worker de cola y checks de entorno aprobados en ambiente objetivo.
