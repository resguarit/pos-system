# Feature: Gestión de Servicios

## Descripción General

Se ha implementado un sistema completo de gestión de servicios para clientes que permite:
- Visualizar el estado de servicios por cliente en formato de tarjetas
- Administrar un catálogo de servicios (CRUD)
- Ver estados de pago y vencimientos
- Gestionar suscripciones de clientes a servicios

## Componentes Backend

### Modelos

#### ServiceType
Ubicación: `apps/backend/app/Models/ServiceType.php`

Representa los tipos de servicios disponibles en el catálogo.

**Campos:**
- `name`: Nombre del servicio (ej: "Hosting", "SSL", "Dominio")
- `description`: Descripción del servicio
- `price`: Precio base del servicio
- `billing_cycle`: Ciclo de facturación (monthly, quarterly, annual, one_time)
- `icon`: Nombre del ícono para la UI
- `is_active`: Si el servicio está activo

#### ClientService (actualizado)
Ubicación: `apps/backend/app/Models/ClientService.php`

Representa la suscripción de un cliente a un servicio.

**Campos actualizados:**
- `service_type_id`: Relación opcional con ServiceType
- Mantiene todos los campos existentes

### Controladores

#### ServiceTypeController
Ubicación: `apps/backend/app/Http/Controllers/Api/ServiceTypeController.php`

**Endpoints:**
- `GET /api/service-types` - Listar tipos de servicios
- `POST /api/service-types` - Crear tipo de servicio
- `GET /api/service-types/{id}` - Ver detalles
- `PUT /api/service-types/{id}` - Actualizar
- `DELETE /api/service-types/{id}` - Eliminar (soft delete)

#### ClientServiceController (actualizado)
Ubicación: `apps/backend/app/Http/Controllers/Api/ClientServiceController.php`

**Nuevos endpoints:**
- `GET /api/client-services/customers-with-services` - Obtener clientes con sus servicios agrupados
- `GET /api/client-services/stats` - Estadísticas de servicios

**Endpoints existentes actualizados:**
- `GET /api/client-services` - Listar servicios de clientes
- `POST /api/client-services` - Crear suscripción a servicio
- `PUT /api/client-services/{id}` - Actualizar suscripción
- `DELETE /api/client-services/{id}` - Eliminar suscripción
- `POST /api/client-services/{id}/renew` - Renovar servicio

### Migraciones

1. **2026_01_22_115237_create_service_types_table.php**
   - Crea la tabla `service_types`

2. **2026_01_22_115554_add_service_type_id_to_client_services_table.php**
   - Agrega la relación `service_type_id` a `client_services`

### Seeders

**ServiceTypesSeeder**
Ubicación: `apps/backend/database/seeders/ServiceTypesSeeder.php`

Crea servicios de ejemplo:
- Hosting Web
- Dominio
- SSL Certificado
- Soporte Técnico
- VPS

## Componentes Frontend

### Páginas

#### ServicesManagementPage
Ubicación: `apps/frontend/src/pages/dashboard/ServicesManagementPage.tsx`

Página principal con dos tabs:
1. **Estado de Clientes**: Vista de tarjetas con clientes y sus servicios
2. **Configuración de Servicios**: CRUD de tipos de servicios

### Componentes

#### ServicesCustomersView
Ubicación: `apps/frontend/src/components/services/ServicesCustomersView.tsx`

**Características:**
- Vista en tarjetas de clientes con sus servicios
- Indicadores visuales de servicios activos (iconos)
- Badges de estado de pago (Al día, Por vencer, Vencido)
- Filtros por estado de pago
- Búsqueda por cliente o servicio
- Paginación

**Estados de pago:**
- 🟢 **Al día**: Más de 30 días hasta el vencimiento
- 🟡 **Por vencer**: Vence en los próximos 30 días
- 🔴 **Vencido**: Fecha de vencimiento pasada

#### ServicesConfigView
Ubicación: `apps/frontend/src/components/services/ServicesConfigView.tsx`

**Características:**
- Tabla de tipos de servicios
- Crear, editar y eliminar servicios
- Búsqueda de servicios
- Campos del formulario:
  - Nombre
  - Descripción
  - Precio
  - Ciclo de facturación
  - Icono
  - Estado activo/inactivo

### Navegación

La sección de "Servicios" se agregó a la sidebar como un ítem independiente con:
- Icono: Globe
- Ruta: `/dashboard/servicios`
- Permiso requerido: `ver_clientes`

## Uso

### Crear un tipo de servicio

1. Ir a "Servicios" en la sidebar
2. Seleccionar la tab "Configuración de Servicios"
3. Clic en "Nuevo Servicio"
4. Completar los campos:
   - Nombre (requerido)
   - Precio (requerido)
   - Ciclo de facturación
   - Descripción (opcional)
   - Icono (opcional)
5. Guardar

### Ver estado de servicios de clientes

1. Ir a "Servicios" en la sidebar
2. La tab "Estado de Clientes" muestra:
   - Tarjetas por cliente
   - Servicios activos con iconos
   - Estado de pago de cada servicio
   - Ciclo de facturación

### Filtros disponibles

- **Por búsqueda**: Cliente, email o servicio
- **Por estado**:
  - Todos
  - Vencidos
  - Por vencer (próximos 30 días)
  - Al día
  - Suspendidos

## Consideraciones Técnicas

### Permisos

- Todos los endpoints requieren el permiso `ver_clientes`
- Las operaciones de creación/edición requieren `editar_clientes`

### Ciclos de facturación

- `monthly`: Mensual (se suma 1 mes)
- `quarterly`: Trimestral (se suman 3 meses)
- `annual`: Anual (se suma 1 año)
- `one_time`: Pago único (no se renueva automáticamente)

### Soft Deletes

Tanto `service_types` como `client_services` usan soft deletes para mantener el historial.

## Próximas mejoras sugeridas

1. **Notificaciones automáticas** cuando un servicio está por vencer
2. **Dashboard de ingresos** proyectados por servicios
3. **Generación automática de facturas** para renovaciones
4. **Integración con pagos** para renovaciones automáticas
5. **Historial de pagos** por servicio
6. **Reportes** de servicios más contratados
7. **Plantillas de email** para recordatorios de vencimiento

## Testing

Para probar la funcionalidad:

1. Ejecutar las migraciones:
   ```bash
   php artisan migrate
   ```

2. Poblar datos de ejemplo:
   ```bash
   php artisan db:seed --class=ServiceTypesSeeder
   ```

3. Acceder a la aplicación y navegar a "Servicios"

## Estructura de Base de Datos

### Tabla: service_types
```sql
- id (bigint, primary key)
- name (varchar)
- description (text, nullable)
- price (decimal 15,2)
- billing_cycle (enum: monthly, quarterly, annual, one_time)
- icon (varchar, nullable)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp, nullable)
```

### Tabla: client_services (actualizada)
```sql
- id (bigint, primary key)
- customer_id (bigint, foreign key)
- service_type_id (bigint, foreign key, nullable)
- name (varchar)
- description (text, nullable)
- amount (decimal 15,2)
- billing_cycle (enum: monthly, quarterly, annual, one_time)
- start_date (date)
- next_due_date (date, nullable)
- status (enum: active, suspended, cancelled)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp, nullable)
```
