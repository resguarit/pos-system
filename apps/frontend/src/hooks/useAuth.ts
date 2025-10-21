import { useState, useEffect } from "react";
import useApi from "./useApi";

interface User {
  id: string;
  email: string;
  username: string;
  person?: {
    first_name: string;
    last_name: string;
  };
  role?: {
    id: number;
    name: string;
    description?: string;
  };
  permissions?: string[];
  branches?: Branch[];
}

interface Branch {
  id: string;
  description: string;
  address?: string;
  phone?: string;
  color?: string;
  status?: number;
}

interface AuthState {
  user: User | null;
  currentBranch: Branch | null;
  branches: Branch[];
  permissions: string[];
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    currentBranch: null,
    branches: [],
    permissions: [],
    isLoading: true
  });

  const { request } = useApi();

  // Cargar datos del usuario y sucursales al montar
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const response = await request({
          method: "GET",
          url: "/profile"
        });

        const { user, permissions } = response.data || response;
        const userBranches = user?.branches || [];
        
        // Obtener la sucursal guardada o usar la primera disponible
        const savedBranchId = localStorage.getItem('currentBranch');
        const currentBranch = savedBranchId 
          ? userBranches.find((b: Branch) => b.id === savedBranchId) || userBranches[0]
          : userBranches[0];

        setState({
          user,
          branches: userBranches,
          currentBranch: currentBranch || null,
          permissions: permissions || [],
          isLoading: false
        });

        // Guardar la sucursal actual
        if (currentBranch) {
          localStorage.setItem('currentBranch', currentBranch.id);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthData();
  }, [request]);

  const changeBranch = (branch: Branch) => {
    setState(prev => ({ ...prev, currentBranch: branch }));
    localStorage.setItem('currentBranch', branch.id);
  };

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    
    // Los administradores tienen todos los permisos
    if (state.user.role?.name === 'Admin' || state.user.role?.name === 'admin') {
      return true;
    }
    
    const hasPerm = state.permissions.includes(permission);
    
    // Debug para anular_ventas
    if (permission === 'anular_ventas') {
      console.log('🔍 Debug anular_ventas:', {
        user: state.user.email,
        role: state.user.role?.name,
        permissions: state.permissions,
        hasPermission: hasPerm
      });
    }
    
    return hasPerm;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!state.user) return false;
    
    // Los administradores tienen todos los permisos
    if (state.user.role?.name === 'Admin' || state.user.role?.name === 'admin') {
      return true;
    }
    
    return permissions.some(permission => state.permissions.includes(permission));
  };

  const canAccessBranch = (branchId: string): boolean => {
    if (!state.user) return false;
    
    // Los administradores pueden acceder a todas las sucursales
    if (state.user.role?.name === 'Admin' || state.user.role?.name === 'admin') {
      return true;
    }
    
    // Verificar si el usuario tiene acceso a esta sucursal
    return state.branches.some(branch => branch.id === branchId);
  };

  const getUserDisplayName = (): string => {
    if (!state.user) return '';
    
    if (state.user.person) {
      return `${state.user.person.first_name} ${state.user.person.last_name}`.trim();
    }
    
    return state.user.username || state.user.email;
  };

  const isAdmin = (): boolean => {
    return state.user?.role?.name === 'Admin' || state.user?.role?.name === 'admin';
  };

  return {
    ...state,
    changeBranch,
    hasPermission,
    hasAnyPermission,
    canAccessBranch,
    getUserDisplayName,
    isAdmin,
    isAuthenticated: !!state.user
  };
}