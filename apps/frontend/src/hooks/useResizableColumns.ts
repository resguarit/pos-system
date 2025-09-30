import { useState, useCallback, useRef, useEffect } from 'react';

interface ColumnConfig {
  id: string;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

interface ResizableColumnsState {
  [columnId: string]: number;
}

interface UseResizableColumnsOptions {
  columns: ColumnConfig[];
  storageKey?: string;
  defaultWidth?: number;
}

/**
 * Hook para manejar columnas redimensionables en tablas
 * 
 * Principios aplicados:
 * - SRP: Responsabilidad única de manejar el redimensionamiento de columnas
 * - OCP: Abierto para extensión con nuevas configuraciones
 * - DIP: Depende de abstracciones (configuración de columnas)
 * - DRY: Lógica reutilizable para cualquier tabla
 */
export function useResizableColumns({
  columns,
  storageKey,
  defaultWidth = 150
}: UseResizableColumnsOptions) {
  const [columnWidths, setColumnWidths] = useState<ResizableColumnsState>(() => {
    // Intentar cargar desde localStorage si se proporciona storageKey
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Error loading column widths from localStorage:', error);
      }
    }
    
    // Inicializar con anchos por defecto
    const initialWidths: ResizableColumnsState = {};
    columns.forEach(column => {
      initialWidths[column.id] = column.defaultWidth || defaultWidth;
    });
    return initialWidths;
  });

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  // Guardar en localStorage cuando cambien los anchos
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(columnWidths));
      } catch (error) {
        console.warn('Error saving column widths to localStorage:', error);
      }
    }
  }, [columnWidths, storageKey]);

  /**
   * Obtiene el ancho actual de una columna
   */
  const getColumnWidth = useCallback((columnId: string): number => {
    return columnWidths[columnId] || defaultWidth;
  }, [columnWidths, defaultWidth]);

  /**
   * Establece el ancho de una columna
   */
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    // Aplicar restricciones de ancho
    const minWidth = column.minWidth || 50;
    const maxWidth = column.maxWidth || 800;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));

    setColumnWidths(prev => ({
      ...prev,
      [columnId]: constrainedWidth
    }));
  }, [columns]);

  /**
   * Inicia el redimensionamiento de una columna
   */
  const startResize = useCallback((columnId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(columnId);
    setStartX(event.clientX);
    setStartWidth(getColumnWidth(columnId));
    
    // Agregar estilos al documento para mejorar la experiencia
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [getColumnWidth]);

  /**
   * Maneja el movimiento del mouse durante el redimensionamiento
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = event.clientX - startX;
    const newWidth = startWidth + deltaX;
    
    setColumnWidth(isResizing, newWidth);
  }, [isResizing, startX, startWidth, setColumnWidth]);

  /**
   * Finaliza el redimensionamiento
   */
  const stopResize = useCallback(() => {
    setIsResizing(null);
    setStartX(0);
    setStartWidth(0);
    
    // Restaurar estilos del documento
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Agregar event listeners para el redimensionamiento
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
      };
    }
  }, [isResizing, handleMouseMove, stopResize]);

  /**
   * Obtiene las props para el handle de redimensionamiento
   */
  const getResizeHandleProps = useCallback((columnId: string) => {
    return {
      onMouseDown: (event: React.MouseEvent) => startResize(columnId, event),
      style: {
        cursor: 'col-resize',
        width: '4px',
        height: '100%',
        position: 'absolute' as const,
        right: '-2px',
        top: 0,
        backgroundColor: isResizing === columnId ? '#3b82f6' : 'transparent',
        transition: isResizing === columnId ? 'none' : 'background-color 0.2s ease',
        zIndex: 10,
      },
      title: 'Redimensionar columna'
    };
  }, [startResize, isResizing]);

  /**
   * Obtiene las props para el header de la columna
   */
  const getColumnHeaderProps = useCallback((columnId: string) => {
    return {
      style: {
        width: getColumnWidth(columnId),
        minWidth: getColumnWidth(columnId),
        maxWidth: getColumnWidth(columnId),
        position: 'relative' as const,
      }
    };
  }, [getColumnWidth]);

  /**
   * Obtiene las props para la celda de la columna
   */
  const getColumnCellProps = useCallback((columnId: string) => {
    return {
      style: {
        width: getColumnWidth(columnId),
        minWidth: getColumnWidth(columnId),
        maxWidth: getColumnWidth(columnId),
      }
    };
  }, [getColumnWidth]);

  /**
   * Resetea todos los anchos a los valores por defecto
   */
  const resetColumnWidths = useCallback(() => {
    const resetWidths: ResizableColumnsState = {};
    columns.forEach(column => {
      resetWidths[column.id] = column.defaultWidth || defaultWidth;
    });
    setColumnWidths(resetWidths);
  }, [columns, defaultWidth]);

  return {
    // Estado
    columnWidths,
    isResizing,
    
    // Métodos
    getColumnWidth,
    setColumnWidth,
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    resetColumnWidths,
    
    // Referencias
    tableRef
  };
}
