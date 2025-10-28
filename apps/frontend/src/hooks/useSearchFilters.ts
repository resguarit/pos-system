import { useState, useEffect, useCallback } from 'react';
import { CurrentAccountFilters } from '@/types/currentAccount';

/**
 * Hook personalizado para manejar búsquedas y filtros
 * Sigue el principio de Single Responsibility
 */
export function useSearchFilters<T>(
  initialFilters: Partial<CurrentAccountFilters> = {},
  onFiltersChange?: (filters: CurrentAccountFilters) => void
) {
  const [filters, setFilters] = useState<CurrentAccountFilters>({
    search: '',
    status: '',
    ...initialFilters
  });

  const [debouncedFilters, setDebouncedFilters] = useState<CurrentAccountFilters>(filters);

  // Debounce para evitar demasiadas llamadas a la API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  // Notificar cambios a la función callback
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(debouncedFilters);
    }
  }, [debouncedFilters, onFiltersChange]);

  const updateFilter = useCallback(<K extends keyof CurrentAccountFilters>(
    key: K,
    value: CurrentAccountFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: '',
      ...initialFilters
    });
  }, [initialFilters]);

  const hasActiveFilters = useCallback(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'search') return value && value.trim() !== '';
      return value !== '' && value !== null && value !== undefined;
    });
  }, [filters]);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters: hasActiveFilters()
  };
}

/**
 * Hook para manejar búsqueda con URL parameters
 * Sigue el principio de Open/Closed (extensible)
 */
export function useSearchWithURL(
  initialSearchTerm: string = '',
  onSearchChange?: (searchTerm: string) => void
) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Notify parent component of search changes
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
    clearSearch
  };
}
