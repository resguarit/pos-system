# Checklist de pruebas: color por sucursal

Lista de verificación para validar que el **color por sucursal** funciona correctamente en todas las pantallas que usan `BranchBadge` y `getBranchColor` (utilidad centralizada).

---

## Verificación automática realizada

| Verificación | Resultado |
|-------------|-----------|
| **Type-check (frontend)** | ✓ Pasa |
| **Tests unitarios (vitest)** | ✓ 19 tests pasan (8 sale-calculations + 11 branchColor) |
| **Lint (frontend)** | ⚠ Errores previos en otros archivos (no en branchColor/BranchBadge) |
| **Tests backend (Pest)** | ⚠ Fallos previos en combos, shipments, etc. (no relacionados con sucursales) |

---

## Requisitos previos

- [ ] Al menos **dos sucursales** con **colores distintos** configurados (ej. Sucursal A = azul, Sucursal B = verde).
- [ ] Usuario con acceso a ventas, presupuestos, trazabilidad, envíos, cuentas corrientes, órdenes de compra, transferencias y caja.

---

## 1. Presupuestos

- [ ] Ir a **Ventas** → pestaña **Presupuestos** (o ruta equivalente).
- [ ] Si hay varias sucursales seleccionadas en el contexto, ver que la columna **Sucursal** está visible.
- [ ] Verificar que cada presupuesto muestra un badge con el **nombre de la sucursal** y un **color** que coincide con el configurado para esa sucursal.
- [ ] Presupuestos de sucursales distintas deben verse con **colores distintos** (no todos iguales).
- [ ] Presupuestos **anulados** deben verse con el mismo color pero **algo más tenue** (prop `dimmed`).

---

## 2. Historial de ventas

- [ ] Ir a **Ventas** → pestaña **Ventas** (o **Historial de ventas**).
- [ ] Con varias sucursales en el filtro, la columna **Sucursal** debe estar visible.
- [ ] Cada venta muestra el badge de sucursal con el **color correcto** según la sucursal de la venta.
- [ ] Ventas **anuladas** se ven con el mismo color pero más tenues.
- [ ] Cambiar filtro de sucursal y confirmar que solo aparecen ventas de esa sucursal y que el color del badge coincide.

---

## 3. Trazabilidad de producto

- [ ] Ir a **Inventario** (o **Productos**) → abrir un producto → **Trazabilidad** (o equivalente).
- [ ] En la tabla de eventos/movimientos, la columna **Sucursal** debe mostrar badges con **colores por sucursal**.
- [ ] Eventos con sucursal “Global” no deben usar badge de color; el resto sí, con el color de esa sucursal.
- [ ] Verificar que eventos de sucursales distintas muestran **colores distintos**.

---

## 4. Envíos

- [ ] Ir a **Envíos** (o la ruta donde está la tabla de envíos).
- [ ] Si la tabla tiene columna **Sucursal**, cada envío debe mostrar el badge con el **color de la sucursal** asociada.
- [ ] Envíos de sucursales distintas deben verse con **colores distintos**.

---

## 5. Cuentas corrientes

- [ ] Ir a **Cuentas corrientes** → elegir una cuenta → **Movimientos** (o detalle).
- [ ] En la lista de movimientos, la columna **Sucursal** debe mostrar badges con **color por sucursal**.
- [ ] Cada movimiento con sucursal debe usar el color configurado para esa sucursal.
- [ ] Movimientos de sucursales distintas deben verse con **colores distintos**.

---

## 6. Historial de compras de un cliente

- [ ] Ir a la ficha de un **cliente** → **Compras** (o historial de compras).
- [ ] En la tabla de compras, la columna **Sucursal** (si existe) debe mostrar badges con **color por sucursal**.
- [ ] Compras en sucursales distintas deben verse con **colores distintos**.

---

## 7. Órdenes de compra

- [ ] Ir a **Órdenes de compra**.
- [ ] Con varias sucursales en el contexto, la columna **Sucursal** debe estar visible.
- [ ] Cada orden muestra el badge con el **color de la sucursal** de la orden.
- [ ] Órdenes de sucursales distintas deben verse con **colores distintos**.

---

## 8. Transferencias de stock

- [ ] Ir a **Transferencias** (o **Transferencias de stock**).
- [ ] En la tabla, deben aparecer columnas **Origen** y **Destino** (o equivalentes) con badges.
- [ ] **Origen** y **Destino** deben usar el **color de cada sucursal**.
- [ ] Transferencias entre sucursales distintas deben verse con **dos colores distintos** (origen vs destino).

---

## 9. Historial de movimientos de caja

- [ ] Ir a **Caja** (o **Movimientos de caja**).
- [ ] Si la vista permite **varias sucursales** y hay columna **Sucursal**, cada movimiento debe mostrar el badge con el **color de la sucursal** del movimiento.
- [ ] Movimientos de sucursales distintas deben verse con **colores distintos**.

---

## 10. Regresión general

- [ ] **Sin errores en consola** del navegador al abrir cada una de las pantallas anteriores.
- [ ] **Sin errores en red** (p. ej. 500 o 404) en las peticiones usadas por esas pantallas.
- [ ] Si una sucursal **no tiene color** configurado, el badge debe usar el **color por defecto** (#6b7280, gris) y no romper la UI.
- [ ] Cambiar el **color de una sucursal** en configuración y volver a las pantallas anteriores: los badges deben **actualizarse** al recargar o al volver a cargar datos.

---

## Comandos de verificación automática

Ejecutar desde la raíz del proyecto:

```bash
# Type-check (frontend) — debe pasar
npm run type-check

# Tests unitarios frontend (branchColor + sale-calculations)
cd apps/frontend && npm test

# Lint (frontend) — puede tener warnings/errores previos en otros archivos
cd apps/frontend && npm run lint

# Tests backend (Laravel/Pest) — puede tener fallos previos en combos/shipments/etc.
cd apps/backend && php artisan test
```

**Recomendación:** Para validar solo lo relacionado con color por sucursal, asegurar que **type-check** y **tests del frontend** pasen. Lint y tests del backend sirven para regresión general del proyecto.

---

## Referencia técnica

- **Utilidad**: `src/utils/branchColor.ts` (`getBranchColor`, `getBranchBadgeStyles`, `DEFAULT_BRANCH_COLOR`).
- **Componente**: `src/components/BranchBadge.tsx`.
- **Tests**: `src/utils/branchColor.test.ts`.

Cuando se cambie la lógica de color o el estilo del badge, actualizar primero la utilidad y/o el componente y luego repasar este checklist para asegurar que no se rompa ninguna pantalla.
