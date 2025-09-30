import React from 'react';
import { cn } from '@/lib/utils';

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  columnId: string;
  className?: string;
  getResizeHandleProps: (columnId: string) => {
    onMouseDown: (event: React.MouseEvent) => void;
    style: React.CSSProperties;
    title: string;
  };
  getColumnHeaderProps: (columnId: string) => {
    style: React.CSSProperties;
  };
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

/**
 * Componente para headers de tabla redimensionables
 * 
 * Principios aplicados:
 * - SRP: Responsabilidad única de renderizar headers redimensionables
 * - OCP: Abierto para extensión con nuevas funcionalidades (sorting, etc.)
 * - LSP: Comportamiento consistente con elementos th estándar
 * - ISP: Interface específica para headers de tabla
 */
export const ResizableTableHeader: React.FC<ResizableTableHeaderProps> = ({
  children,
  columnId,
  className,
  getResizeHandleProps,
  getColumnHeaderProps,
  sortable = false,
  sortDirection = null,
  onSort
}) => {
  const resizeHandleProps = getResizeHandleProps(columnId);
  const columnHeaderProps = getColumnHeaderProps(columnId);

  const handleClick = () => {
    if (sortable && onSort) {
      onSort();
    }
  };

  return (
    <th
      {...columnHeaderProps}
      className={cn(
        'relative select-none border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
        sortable && 'cursor-pointer hover:bg-gray-100 transition-colors',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{children}</span>
        
        {sortable && (
          <div className="ml-2 flex flex-col">
            <svg
              className={cn(
                'h-3 w-3 transition-colors',
                sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
            <svg
              className={cn(
                'h-3 w-3 -mt-1 transition-colors',
                sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Handle de redimensionamiento */}
      <div {...resizeHandleProps} />
    </th>
  );
};

/**
 * Componente para celdas de tabla con ancho redimensionable
 * 
 * Principios aplicados:
 * - SRP: Responsabilidad única de renderizar celdas con ancho específico
 * - DRY: Reutiliza la lógica de ancho de columnas
 */
interface ResizableTableCellProps {
  children: React.ReactNode;
  columnId: string;
  className?: string;
  getColumnCellProps: (columnId: string) => {
    style: React.CSSProperties;
  };
}

export const ResizableTableCell: React.FC<ResizableTableCellProps> = ({
  children,
  columnId,
  className,
  getColumnCellProps
}) => { 
  const cellProps = getColumnCellProps(columnId);

  return (
    <td
      {...cellProps}
      className={cn(
        'px-4 py-3 text-sm text-gray-900 border-b border-gray-200',
        className
      )}
    >
      <div className="truncate" title={typeof children === 'string' ? children : undefined}>
        {children}
      </div>
    </td>
  );
};
