import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export const useTableSort = <T extends Record<string, any>>(
  data: T[],
  initialSortKey?: keyof T,
  initialDirection: SortDirection = 'asc'
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialSortKey || null,
    direction: initialDirection,
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle nested objects (e.g., current_stage.name)
      const aVal = typeof aValue === 'object' && aValue?.name ? aValue.name : aValue;
      const bVal = typeof bValue === 'object' && bValue?.name ? bValue.name : bValue;

      // Compare values
      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: keyof T) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        if (prev.direction === 'desc') {
          return { key: null, direction: null };
        }
      }
      // New column, start with asc
      return { key, direction: 'asc' };
    });
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
  };
};
