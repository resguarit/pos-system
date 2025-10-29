# 🔍 Scripts de Verificación de Logs

## 📋 Dos Versiones Disponibles

### 1. `verify-logs-fix.sh` - Para ejecutar DESDE TU COMPUTADORA LOCAL
```bash
./scripts/verify-logs-fix.sh
```
- Se conecta al servidor via SSH
- Útil para verificar desde tu máquina local

### 2. `verify-logs-fix-server.sh` - Para ejecutar DIRECTAMENTE EN EL SERVIDOR
```bash
ssh pos-vps-root
cd /home/api.heroedelwhisky.com.ar/public_html
./scripts/verify-logs-fix-server.sh
```
- Se ejecuta directamente en el servidor
- No intenta hacer SSH (porque ya estás ahí)
- Útil cuando ya estás conectado al servidor

## 🎯 Qué Verifica

Ambos scripts verifican:

1. ✅ **Permisos de storage/logs** - Debe ser 775 o 2775
2. ✅ **Capacidad de escritura** - Puede escribir en logs
3. ✅ **Logs de debug eliminados** - No hay logs problemáticos en StockService
4. ✅ **Ownership correcto** - www-data:www-data
5. ✅ **Configuración de deploy** - Permisos se configuran automáticamente
6. ✅ **Errores recientes** - Busca errores de permisos en logs

## ✅ Resultado Esperado

Si todo está bien, verás:
```
✅ ✅ ✅ TODO CORRECTO - El problema NO debería volver a pasar
✓ Permisos de logs configurados correctamente
✓ Logs de debug eliminados de StockService
✓ PHP/web server puede escribir logs
✓ Configuración de deploy automática en lugar
```

## 🔧 Si Hay Problemas

El script te indicará qué hacer:

```bash
# Si hay problemas de escritura:
sudo chmod -R 775 storage/logs
sudo chown -R www-data:www-data storage/logs

# Si aún hay logs de debug:
# Verifica app/Services/StockService.php
```

## 📝 Nota

- El script desde el servidor es más rápido porque no necesita SSH
- El script desde local es útil cuando quieres verificar sin conectarte manualmente
- Ambos verifican lo mismo, solo cambia cómo se ejecutan

