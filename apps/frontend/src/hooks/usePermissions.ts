import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS_CONFIG } from '@/config/permissions';
import features from '@/config/features';

export function usePermissions() {
  const { user } = useAuth();

  // Helper para verificar si el usuario tiene permisos válidos
  const hasValidUserPermissions = (): boolean => {
    return !!(user && user.permissions);
  };

  // Verificación de permisos del usuario autenticado
  const hasPermission = (permission: string): boolean => {
    if (!hasValidUserPermissions()) {
      return false;
    }

    // Los permisos vienen como strings simples, no como objetos
    return user!.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!hasValidUserPermissions()) {
      return false;
    }

    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!hasValidUserPermissions()) {
      return false;
    }

    return permissions.every(permission => hasPermission(permission));
  };

  // Verificación de features habilitadas
  const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
    return FEATURES[feature] === true;
  };

  // Obtención de permisos activos basados en features
  const getActivePermissions = (): string[] => {
    const activePermissions: string[] = [];
    
    Object.entries(PERMISSIONS_CONFIG).forEach(([, config]) => {
      if (isFeatureEnabled((config as any).feature as keyof typeof FEATURES)) {
        activePermissions.push(...(config as any).permissions);
      }
    });
    
    return activePermissions;
  };

  // Verificación si un permiso está activo (basado en features)
  const isPermissionActive = (permission: string): boolean => {
    const activePermissions = getActivePermissions();
    return activePermissions.includes(permission);
  };

  // Helper para obtener configuración de módulo
  const getModuleConfig = (module: string) => {
    return PERMISSIONS_CONFIG[module as keyof typeof PERMISSIONS_CONFIG];
  };

  // Obtención de permisos de un módulo específico
  const getModulePermissions = (module: string): string[] => {
    const moduleConfig = getModuleConfig(module);
    if (!moduleConfig) {
      return [];
    }

    return moduleConfig.permissions.filter(permission => hasPermission(permission));
  };

  // Verificación si un módulo está habilitado
  const isModuleEnabled = (module: string): boolean => {
    const moduleConfig = getModuleConfig(module);
    return moduleConfig ? isFeatureEnabled(moduleConfig.feature as keyof typeof FEATURES) : false;
  };

  // Obtención de módulos habilitados
  const getEnabledModules = (): string[] => {
    return Object.entries(PERMISSIONS_CONFIG)
      .filter(([_, config]) => isFeatureEnabled((config as any).feature as keyof typeof FEATURES))
      .map(([module, _]) => module);
  };

  // Verificación de acceso a módulo (combina permisos de usuario y features)
  const canAccessModule = (module: string): boolean => {
    const moduleConfig = getModuleConfig(module);
    if (!moduleConfig) {
      return false;
    }

    // Verificar que la feature esté habilitada Y que el usuario tenga permisos
    return isFeatureEnabled(moduleConfig.feature as keyof typeof FEATURES) && 
           hasAnyPermission(moduleConfig.permissions);
  };

  // Validación de permisos en tiempo de ejecución
  const validatePermissions = (requiredPermissions: string[]): {
    isValid: boolean;
    inactivePermissions: string[];
  } => {
    const activePermissions = getActivePermissions();
    const inactivePermissions: string[] = [];
    
    requiredPermissions.forEach(permission => {
      if (!activePermissions.includes(permission)) {
        inactivePermissions.push(permission);
      }
    });
    
    return {
      isValid: inactivePermissions.length === 0,
      inactivePermissions
    };
  };

  return {
    // Permisos del usuario
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions: user?.permissions || [],
    
    // Features y configuración
    isFeatureEnabled,
    isPermissionActive,
    getActivePermissions,
    getModulePermissions,
    isModuleEnabled,
    getEnabledModules,
    
    // Acceso y validación
    canAccessModule,
    validatePermissions
  };
}
