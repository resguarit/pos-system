import { useState, useEffect } from 'react';
import api from '@/lib/api';

/**
 * Interface para sucursales
 */
export interface Branch {
  id: number;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Custom hook para obtener y gestionar sucursales
 */
export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/branches');
      setBranches(response.data.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sucursales');
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    branches,
    loading,
    error,
    refetch: fetchBranches,
  };
}
