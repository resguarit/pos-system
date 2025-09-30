# 🌱 Sistema de Seeders por Entorno

Este proyecto implementa un sistema de seeders separados para diferentes entornos (producción y desarrollo).

## 📁 Estructura de Seeders

### Seeders de Producción (`ProductionSeeder`)
Contiene solo los datos esenciales necesarios para el funcionamiento del sistema en producción:

- ✅ Configuraciones fiscales (IVA, condiciones fiscales, tipos de documento)
- ✅ Configuraciones de negocio (métodos de pago, tipos de movimiento)
- ✅ Sistema de permisos y roles
- ✅ Usuario administrador básico
- ✅ Configuraciones de ventas

### Seeders de Desarrollo (`DevelopmentSeeder`)
Contiene datos ficticios para desarrollo y testing:

- 🧪 Sucursales de prueba
- 🧪 Proveedores y categorías de prueba
- 🧪 Clientes y productos de prueba
- 🧪 Ventas y órdenes de compra de prueba
- 🧪 Movimientos de caja y cuentas corrientes de prueba

## 🚀 Comandos Disponibles

### 1. Seeding Automático por Entorno
```bash
# Ejecuta seeders según el entorno actual
php artisan db:seed
```
- **Local/Development**: Ejecuta producción + desarrollo
- **Production**: Solo ejecuta producción

### 2. Solo Seeders de Producción
```bash
# Ejecuta únicamente los seeders esenciales para producción
php artisan db:seed:production

# Sin confirmación
php artisan db:seed:production --force
```

### 3. Solo Seeders de Desarrollo
```bash
# Ejecuta únicamente los seeders de datos de prueba
php artisan db:seed:development

# Sin confirmación
php artisan db:seed:development --force

# Con migraciones fresh (recrea la base de datos)
php artisan db:seed:development --fresh
```

### 4. Todos los Seeders
```bash
# Ejecuta producción + desarrollo
php artisan db:seed:full

# Sin confirmación
php artisan db:seed:full --force

# Con migraciones fresh
php artisan db:seed:full --fresh
```

## ⚙️ Configuración Avanzada

### Variables de Entorno

Puedes forzar la ejecución de seeders de desarrollo en cualquier entorno usando:

```env
FORCE_DEVELOPMENT_SEEDERS=true
```

### Entornos Reconocidos

- **Desarrollo**: `local`, `development`, `testing`
- **Producción**: `production`, `prod`

## 🔒 Seguridad

- Los seeders de desarrollo **NUNCA** se ejecutan automáticamente en producción
- El comando `db:seed:development` verifica el entorno antes de ejecutar
- Se requiere confirmación manual para evitar ejecuciones accidentales

## 📝 Ejemplos de Uso

### Desarrollo Local
```bash
# Configuración inicial completa
php artisan migrate:fresh
php artisan db:seed:full

# Solo datos de prueba después de cambios
php artisan db:seed:development
```

### Producción
```bash
# Solo datos esenciales
php artisan db:seed:production --force
```

### Testing
```bash
# Datos completos para tests
php artisan migrate:fresh
php artisan db:seed:full --force
```

## 🎯 Beneficios

1. **Seguridad**: Los datos de prueba nunca llegan a producción
2. **Flexibilidad**: Diferentes conjuntos de datos según el entorno
3. **Mantenibilidad**: Seeders organizados y documentados
4. **Facilidad de uso**: Comandos específicos para cada necesidad
5. **Control**: Confirmaciones y verificaciones de entorno


