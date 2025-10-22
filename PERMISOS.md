# Sistema de Permisos - POS System

## Descripción General

El sistema de permisos permite controlar el acceso de los usuarios a diferentes funcionalidades del sistema basándose en roles. Cada usuario tiene un rol asignado, y cada rol puede tener múltiples permisos.

## Rol de Administrador (Admin)

### ⚠️ Comportamiento Especial

El rol **Admin** tiene un comportamiento especial en el sistema:

- ✅ **Acceso completo automático**: Los usuarios con rol Admin tienen acceso a TODAS las funcionalidades del sistema, independientemente de los permisos configurados.
- 🔒 **Nombre no editable**: El nombre del rol Admin no puede ser modificado.
- 🔒 **No se puede eliminar**: El rol Admin no puede ser eliminado del sistema.
- 🔒 **Permisos no editables**: Los permisos del rol Admin no pueden ser modificados desde la interfaz.
- 🔒 **Descripción no editable**: La descripción del rol Admin no puede ser modificada.
- 🎯 **Indicador visual**: En las páginas donde se controlan permisos, aparece un badge azul "Admin" con un tooltip informativo.

### Implementación Técnica

```typescript
// En useAuth.ts
const hasPermission = (permission: string): boolean => {
  if (!state.user) return false;
  
  // Los administradores tienen todos los permisos
  if (state.user.role?.name === 'Admin' || state.user.role?.name === 'admin') {
    return true;
  }
  
  return state.permissions.includes(permission);
};
```

### Razón del Diseño

Este comportamiento está diseñado así para:
1. Garantizar que siempre exista un usuario con acceso completo al sistema
2. Evitar que errores en la configuración de permisos bloqueen funciones críticas
3. Simplificar la administración del sistema

## Validación de Permisos

### Frontend (React)

Los permisos se validan en el frontend usando el hook `useAuth`:

```typescript
import { useAuth } from "@/hooks/useAuth";

const { hasPermission, isAdmin } = useAuth();

// Verificar un permiso específico
if (hasPermission('ver_estadisticas_usuario')) {
  // Mostrar estadísticas de usuario
}

// Verificar si es admin
if (isAdmin()) {
  // Usuario es administrador
}
```

### Backend (Laravel)

Los permisos también se validan en el backend para garantizar la seguridad:

```php
// En un controlador
$user = auth()->user();
$hasPermission = $user->role
    ->permissions()
    ->where('name', 'ver_estadisticas_usuario')
    ->exists();

if (!$hasPermission) {
    return response()->json([
        'success' => false,
        'message' => 'No tienes permiso para ver estadísticas de usuarios'
    ], 403);
}
```

### Permisos de Estadísticas de Usuario

El permiso `ver_estadisticas_usuario` controla el acceso a:
- Ver estadísticas de ventas por usuario (`/users/{id}/sales/statistics`)
- Ver ventas diarias por usuario (`/users/{id}/sales/daily`)
- Ver ventas mensuales por usuario (`/users/{id}/sales/monthly`)
- Ver productos más vendidos por usuario (`/users/{id}/sales/top-products`)
- Acceder a la página de desempeño de usuario (`/dashboard/usuarios/{id}/desempeno`)

**Roles que tienen este permiso:**
- Admin (acceso completo automático)
- Supervisor

## Gestión de Permisos

### Ver permisos asignados a roles

```bash
cd apps/backend
php artisan permissions:check-anular-ventas
```

### Remover permiso de un rol

```bash
cd apps/backend
php artisan permissions:remove-anular-ventas NombreDelRol
```

### Actualizar permisos en el seeder

Los permisos se definen en `apps/backend/database/seeders/PermissionSeeder.php`:

```php
$permissions = [
    ['name' => 'ver_ventas', 'description' => 'Ver listado de ventas', 'module' => 'ventas'],
    ['name' => 'crear_ventas', 'description' => 'Registrar nueva venta', 'module' => 'ventas'],
    ['name' => 'anular_ventas', 'description' => 'Anular venta', 'module' => 'ventas'],
    // ...
];
```

## Indicadores Visuales en la UI

### Badge de Admin

Cuando un usuario con rol Admin accede al sistema, verá un badge azul con un ícono de escudo en las páginas principales:

```
[Ventas Globales] [🛡️ Admin]
```

Al pasar el mouse sobre el badge, aparece un tooltip:
> "Como administrador, tienes acceso a todas las funciones independientemente de los permisos configurados"

### Alerta en Formulario de Roles

Al editar el rol Admin, aparece una alerta informativa:

```
ℹ️ Rol de Administrador
El rol Admin tiene acceso automático a todos los permisos del sistema, 
independientemente de los permisos seleccionados aquí. Esta configuración 
no puede ser modificada.
```

## Comandos Artisan Útiles

### CheckAnularVentasPermission
Verifica qué roles tienen el permiso `anular_ventas`:

```bash
php artisan permissions:check-anular-ventas
```

### RemoveAnularVentasFromRole
Remueve el permiso `anular_ventas` de un rol específico:

```bash
php artisan permissions:remove-anular-ventas Supervisor
```

## Mejores Prácticas

1. **Nunca remover el rol Admin** del sistema
2. **No intentar modificar o eliminar el rol Admin** - está protegido a nivel de código
3. **Siempre validar permisos en backend** además del frontend
4. **Usar permisos específicos** en lugar de genéricos (ej: `anular_ventas` en vez de `gestionar_ventas`)
5. **Documentar cambios** en los permisos cuando se agregan o modifican
6. **Probar con usuarios no-admin** para verificar que las restricciones funcionan correctamente

## Estructura de Base de Datos

### Tabla: `roles`
- `id`: Identificador único
- `name`: Nombre del rol (ej: "Admin", "Cajero", "Supervisor")
- `description`: Descripción del rol
- `active`: Estado del rol

### Tabla: `permissions`
- `id`: Identificador único
- `name`: Nombre del permiso (ej: "anular_ventas")
- `description`: Descripción del permiso
- `module`: Módulo al que pertenece (ej: "ventas")

### Tabla: `permission_role` (pivot)
- `role_id`: FK a roles
- `permission_id`: FK a permissions

### Tabla: `users`
- `id`: Identificador único
- `role_id`: FK a roles
- ... otros campos

## Troubleshooting

### Problema: "Aunque no tengo el permiso habilitado, puedo realizar la acción"

**Posibles causas:**
1. ✅ Eres usuario Admin (comportamiento esperado)
2. Tu rol tiene el permiso asignado en la base de datos
3. La validación no está implementada en el backend

**Solución:**
1. Verificar tu rol: `SELECT * FROM users WHERE id = tu_id;`
2. Verificar permisos del rol: `php artisan permissions:check-anular-ventas`
3. Verificar que el backend valida el permiso en el controlador

### Problema: "No puedo editar o eliminar el rol Admin"

**Esto es comportamiento esperado**. El rol Admin está diseñado para:
- Tener acceso completo y permanente al sistema
- No poder ser modificado (nombre, descripción, permisos)
- No poder ser eliminado

Esta protección existe en:
- **Frontend**: Campos y botones deshabilitados
- **Backend**: Validación que retorna error 403

**Mensaje de error del backend:**
- Modificar: `"El rol Admin no puede ser modificado"`
- Eliminar: `"El rol Admin no puede ser eliminado"`

### Problema: "Los cambios de permisos no se reflejan en el frontend"

**Solución:**
1. Cerrar sesión y volver a iniciar sesión
2. O recargar la página (F5)
3. Los permisos se cargan al iniciar sesión desde `/api/profile`

## Contacto

Para dudas o problemas con el sistema de permisos, contactar al equipo de desarrollo.
