import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { getAuthToken, saveAuthToken } from '@/lib/auth';
import type { User } from '@/types/user';

// --- Definición del Contexto ---
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isLoading: boolean; // Alias para compatibilidad
  login: (token: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook para usar el contexto de autenticación fácilmente.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// --- Componente Proveedor del Contexto ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Cierra la sesión, limpia TODO el localStorage de la aplicación y redirige al login.
   * Se usa useCallback para evitar que la función se recree innecesariamente.
   */
  const logout = useCallback(() => {
    setUser(null);
    
    // ¡ACCIÓN DE LIMPIEZA!
    // Esto borra absolutamente todo el localStorage para tu dominio (ej: localhost:5173).
    // Es la forma más efectiva de asegurar un estado limpio.
    localStorage.clear();
    
    // Si prefirieras borrar solo el token, usarías la siguiente línea en su lugar:
    // removeAuthToken();

    navigate('/login', { replace: true });
  }, [navigate]);

  /**
   * Carga el perfil del usuario si existe un token.
   * Si falla (ej. por un error 401), llama a logout para limpiar la sesión.
   */
  const loadProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<{ user: User; permissions: string[] }>('/profile');
      
      // Combinar la información del usuario con sus permisos
      const userWithPermissions: User = {
        ...response.data.user,
        permissions: response.data.permissions || []
      };
      
      setUser(userWithPermissions);
    } catch (error: any) {
      console.error("No se pudo cargar el perfil:", error);
      
      // Si es un error 401 o 403, cerrar sesión
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        logout();
      } else {
        // Para otros errores, simplemente mostrar que no se pudo cargar
        setLoading(false);
      }
    } finally {
      // Solo setear loading false si no se llamó logout
      if (getAuthToken()) {
        setLoading(false);
      }
    }
  }, [logout]);

  /**
   * Inicia sesión, guarda el token y carga el perfil.
   */
  const login = async (token: string) => {
    setLoading(true);
    saveAuthToken(token);
    await loadProfile();
    navigate('/'); // Redirige al dashboard principal después del login
  };

  /**
   * Verifica si el usuario tiene un permiso específico.
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados.
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user || !user.permissions || permissions.length === 0) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }, [user]);

  /**
   * Al montar el componente, intenta cargar el perfil del usuario.
   */
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      isLoading: loading, // Alias para compatibilidad
      login,
      logout,
      hasPermission,
      hasAnyPermission
    }}>
      {/* Muestra los hijos solo cuando la carga inicial ha terminado */}
      {!loading ? children : null}
    </AuthContext.Provider>
  );
};