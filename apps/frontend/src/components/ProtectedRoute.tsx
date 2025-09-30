import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { isPermissionActive } from '@/hooks/usePermissionValidation';

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
  const { isAuthenticated, hasPermission, hasAnyPermission, isLoading } = useAuth();

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

  // Filtrar permisos que están activos según las features habilitadas
  const activePermissions = permissions.filter(permission => isPermissionActive(permission));
  
  // Si ningún permiso está activo, mostrar mensaje de feature deshabilitada
  if (activePermissions.length === 0) {
    return fallback || (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Función deshabilitada</h3>
          <p className="text-gray-600">
            Esta función está deshabilitada en la configuración del sistema.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Permisos requeridos: {permissions.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  // Verificar permisos activos
  const hasRequiredPermission = requireAny 
    ? hasAnyPermission(activePermissions)
    : activePermissions.every((permission: string) => hasPermission(permission));

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
            Permisos requeridos: {activePermissions.join(', ')}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Tus permisos: {((useAuth().user as any)?.permissions || []).join(', ') || 'Ninguno'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Tu rol: {((useAuth().user as any)?.role?.name || 'Sin rol asignado')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
