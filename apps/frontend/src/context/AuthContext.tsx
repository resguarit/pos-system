import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getAuthToken, saveAuthToken } from '@/lib/auth';
import type { User } from '@/types/user';
import { isPermissionDisabledByFeature } from '@/config/permissions';

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
  const hasLoadedProfile = useRef(false);

  /**
   * Cierra la sesión, limpia TODO el localStorage de la aplicación y redirige al login.
   * Se usa useCallback para evitar que la función se recree innecesariamente.
   */
  const logout = () => {
    setUser(null);

    // ¡ACCIÓN DE LIMPIEZA!
    // Esto borra absolutamente todo el localStorage para tu dominio (ej: localhost:5173).
    // Es la forma más efectiva de asegurar un estado limpio.
    localStorage.clear();

    // Si prefirieras borrar solo el token, usarías la siguiente línea en su lugar:
    // removeAuthToken();

    navigate('/login', { replace: true });
  };

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

      // Establecer el usuario directamente
      setUser(userWithPermissions);
    } catch (error: any) {
      console.error("No se pudo cargar el perfil:", error);

      // Si es un error 401 o 403, cerrar sesión
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // Llamar logout directamente sin dependencia
        setUser(null);
        localStorage.clear();
        navigate('/login', { replace: true });
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
  }, [navigate]);

  /**
   * Inicia sesión, guarda el token y carga el perfil.
   */
  const login = useCallback(async (token: string) => {
    setLoading(true);
    saveAuthToken(token);
    await loadProfile();
    navigate('/'); // Redirige al dashboard principal después del login
  }, [loadProfile, navigate]);

  // Permisos de RESTRICCIÓN: Estos limitan capacidades en lugar de otorgarlas.
  // Los administradores NO deben tener estos automáticamente - deben verificarse
  // directamente en los permisos asignados al usuario.
  const RESTRICTION_PERMISSIONS = [
    'solo_crear_presupuestos', // Restringe a solo poder crear presupuestos (no facturas)
  ];

  /**
   * Verifica si el usuario tiene un permiso específico.
   */
  const hasPermission = (permission: string): boolean => {
    // 1. Verificar si la feature asociada está deshabilitada (prioridad sobre todo, incluso admin)
    if (isPermissionDisabledByFeature(permission)) {
      return false;
    }

    if (!user || !user.permissions) {
      return false;
    }

    // Para permisos de RESTRICCIÓN, verificar directamente en los permisos del usuario
    // (los admins NO deben tener estas restricciones automáticamente)
    if (RESTRICTION_PERMISSIONS.includes(permission)) {
      return user.permissions.includes(permission);
    }

    // Los administradores tienen todos los permisos (excepto restricciones)
    if (user.role?.name === 'Admin' || user.role?.name === 'admin' || user.role?.name === 'Administrador') {
      return true;
    }

    return user.permissions.includes(permission);
  };

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados.
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions || permissions.length === 0) return false;

    // Los administradores tienen todos los permisos
    if (user.role?.name === 'Admin' || user.role?.name === 'admin' || user.role?.name === 'Administrador') {
      return true;
    }

    return permissions.some(permission => user.permissions.includes(permission));
  };

  /**
   * Al montar el componente, intenta cargar el perfil del usuario.
   */
  useEffect(() => {
    if (!hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  /**
   * Detectar cambios en roles y recargar página completa
   */
  useEffect(() => {
    if (!user) return;

    const checkRolesUpdate = () => {
      const rolesUpdated = localStorage.getItem('roles_updated');
      if (rolesUpdated) {
        // Mostrar mensaje y recargar página completa para actualizar sidebar y layout
        toast.success('Permisos actualizados', {
          description: 'Recargando la página para aplicar los cambios...'
        });

        // Limpiar la marca
        localStorage.removeItem('roles_updated');

        // Recargar página completa después de un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    // Verificar cada 2 segundos si hay cambios en roles
    const interval = setInterval(checkRolesUpdate, 2000);

    return () => clearInterval(interval);

  }, [user]);

  /**
   * Verificar periódicamente si el usuario está dentro del horario permitido.
   */
  useEffect(() => {
    if (!user || user.role?.name === 'Admin' || user.role?.name === 'admin' || user.role?.name === 'Administrador') {
      return;
    }

    const checkSchedule = () => {
      const schedule = user.role?.access_schedule;

      // Si no hay horario o no está habilitado, permitir acceso
      if (!schedule || !schedule.enabled) {
        return;
      }

      const now = new Date();
      // Ajustar día: 0=Domingo en JS, pero 7=Domingo en backend/PHP
      let currentDay = now.getDay();
      if (currentDay === 0) currentDay = 7;

      // Verificar día
      if (schedule.days && !schedule.days.includes(currentDay)) {
        logoutWithReason('Tu horario de acceso no incluye el día de hoy.');
        return;
      }

      // Verificar hora
      if (schedule.start_time && schedule.end_time) {
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        if (currentTime < schedule.start_time || currentTime > schedule.end_time) {
          logoutWithReason(`Tu horario de trabajo ha finalizado (${schedule.start_time} - ${schedule.end_time} hs).`);
          return;
        }
      }
    };

    const logoutWithReason = (reason: string) => {
      toast.warning('Turno finalizado', {
        description: reason,
        duration: 5000,
      });
      logout();
    };

    // Verificar cada 1 minuto
    const interval = setInterval(checkSchedule, 60000);

    // Verificar inmediatamente al montar o cambiar usuario (si ya pasaron unos segundos del login)
    // Damos un pequeño delay para no chocar con el login inmediato
    const timeout = setTimeout(checkSchedule, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user, logout]);

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