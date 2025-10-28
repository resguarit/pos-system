# Sistema de Actualización Masiva de Precios

## Descripción

Sistema modular y escalable para actualizar precios de productos de forma masiva, implementado siguiendo los principios SOLID y las mejores prácticas de programación.

## Arquitectura

### Patrones de Diseño Implementados

1. **Strategy Pattern** (`PriceUpdateStrategy.ts`)
   - `PercentageUpdateStrategy`: Actualización por porcentaje
   - `FixedUpdateStrategy`: Actualización por monto fijo
   - Permite agregar nuevas estrategias sin modificar código existente (Open/Closed Principle)

2. **Repository Pattern** (`ProductRepository.ts`)
   - Centraliza las operaciones de datos
   - Abstrae la lógica de acceso a datos
   - Facilita testing y mantenimiento

3. **Component Composition**
   - Componentes pequeños y reutilizables
   - Separación clara de responsabilidades
   - Fácil de testear y mantener

### Estructura de Componentes

```
BulkPriceUpdate/
├── BulkPriceUpdateModal.tsx      # Modal principal con tabs
├── UpdateByProduct.tsx            # Actualización por producto
├── UpdateByCategory.tsx           # Actualización por categoría
├── UpdateBySupplier.tsx           # Actualización por proveedor
├── UpdateTypeSelector.tsx         # Selector de tipo (porcentaje/fijo)
├── UpdateValueInput.tsx           # Input para valor de actualización
├── PreviewCard.tsx                # Card de vista previa
└── index.ts                       # Exports centralizados
```

## Características

### 1. Actualización por Producto
- Búsqueda en tiempo real
- Selección múltiple con checkboxes
- Preview de cambios antes de aplicar
- Validación de datos

### 2. Actualización por Categoría
- Selección de múltiples categorías
- Preview automático de productos afectados
- Estadísticas en tiempo real

### 3. Actualización por Proveedor
- Selección de múltiples proveedores
- Preview de productos afectados
- Información detallada de proveedores

### 4. Tipos de Actualización
- **Porcentaje**: Aumentar/disminuir por porcentaje (ej: +10%, -5%)
- **Monto Fijo**: Aumentar/disminuir por monto fijo (ej: +$100, -$50)

## Principios SOLID Aplicados

### Single Responsibility Principle (SRP)
- Cada componente tiene una única responsabilidad
- `UpdateTypeSelector`: Solo maneja la selección del tipo
- `UpdateValueInput`: Solo maneja el input del valor
- `PreviewCard`: Solo muestra el preview

### Open/Closed Principle (OCP)
- El sistema está abierto a extensión pero cerrado a modificación
- Nuevas estrategias de actualización se pueden agregar sin modificar código existente
- Nuevos métodos de actualización (ej: por marca) se pueden agregar fácilmente

### Liskov Substitution Principle (LSP)
- Las estrategias implementan la interfaz `UpdateStrategy`
- Cualquier estrategia puede ser usada de forma intercambiable

### Interface Segregation Principle (ISP)
- Interfaces específicas para cada propósito
- Los componentes solo dependen de las interfaces que necesitan

### Dependency Inversion Principle (DIP)
- Los componentes dependen de abstracciones (interfaces)
- No dependen de implementaciones concretas

## Mejores Prácticas Implementadas

### 1. TypeScript
- Tipado fuerte en todos los componentes
- Interfaces bien definidas
- Type safety en toda la aplicación

### 2. React Hooks
- `useState`: Manejo de estado local
- `useEffect`: Efectos secundarios controlados
- `useMemo`: Optimización de cálculos costosos
- `useCallback`: Optimización de funciones

### 3. UX/UI
- Feedback visual inmediato
- Loading states
- Error handling con mensajes claros
- Preview antes de aplicar cambios
- Confirmación de acciones destructivas

### 4. Performance
- Memoización de cálculos costosos
- Lazy loading de datos
- Debouncing en búsquedas
- Optimización de re-renders

### 5. Manejo de Errores
- Try-catch en todas las operaciones async
- Mensajes de error descriptivos
- Rollback en caso de error
- Logging para debugging

## Uso

```tsx
import { BulkPriceUpdateModal } from '@/components/BulkPriceUpdate';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    // Refrescar datos
    console.log('Precios actualizados exitosamente');
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Actualizar Precios
      </Button>
      
      <BulkPriceUpdateModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

## Testing

### Unit Tests
- Testear estrategias de actualización
- Testear validaciones
- Testear cálculos de preview

### Integration Tests
- Testear flujo completo de actualización
- Testear interacción entre componentes
- Testear llamadas a API

### E2E Tests
- Testear flujo de usuario completo
- Testear casos edge
- Testear manejo de errores

## Extensibilidad

### Agregar Nueva Estrategia de Actualización

```typescript
export class CustomUpdateStrategy implements UpdateStrategy {
  constructor(private customValue: number) {}

  calculateNewPrice(currentPrice: number): number {
    // Implementar lógica personalizada
    return currentPrice * this.customValue;
  }

  validate(): { isValid: boolean; error?: string } {
    // Implementar validación
    return { isValid: true };
  }
}
```

### Agregar Nuevo Método de Actualización

1. Crear componente `UpdateByX.tsx`
2. Implementar lógica de selección
3. Agregar tab en `BulkPriceUpdateModal.tsx`
4. Exportar en `index.ts`

## Mantenimiento

### Checklist de Mantenimiento
- [ ] Actualizar dependencias regularmente
- [ ] Revisar y actualizar tests
- [ ] Monitorear performance
- [ ] Revisar logs de errores
- [ ] Actualizar documentación

### Mejoras Futuras
- [ ] Agregar actualización por marca
- [ ] Agregar actualización por rango de precios
- [ ] Agregar historial de actualizaciones
- [ ] Agregar exportación de reportes
- [ ] Agregar programación de actualizaciones

## Contribución

Para contribuir al proyecto:
1. Seguir los principios SOLID
2. Mantener la separación de responsabilidades
3. Escribir tests para nuevas funcionalidades
4. Documentar cambios importantes
5. Usar TypeScript con tipado fuerte
