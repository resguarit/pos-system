import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: string[];
  requireAny?: boolean; // Si es true, solo necesita UNO de los permisos
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  permissions = [], 
  requireAny = false,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso no autorizado</h3>
          <p className="text-gray-600">Debes iniciar sesión para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  // Si no se especifican permisos, solo verificar autenticación
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Verificar permisos directamente
  const hasRequiredPermission = requireAny 
    ? hasAnyPermission(permissions)
    : permissions.every((permission: string) => hasPermission(permission));

  if (!hasRequiredPermission) {
    return fallback || (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin permisos</h3>
          <p className="text-gray-600">
            No tienes permisos para acceder a esta función.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Permisos requeridos: {permissions.join(', ')}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Tu rol: {user?.role?.name || 'Sin rol asignado'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
