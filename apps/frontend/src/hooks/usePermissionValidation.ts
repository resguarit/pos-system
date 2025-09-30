import { FEATURES } from '@/config/features'
import { PERMISSIONS_CONFIG } from '@/config/permissions'

// Función para verificar si una feature está habilitada
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] === true
}

// Función para obtener todos los permisos activos basados en features habilitadas
export function getActivePermissions(): string[] {
  const activePermissions: string[] = []
  
  Object.entries(PERMISSIONS_CONFIG).forEach(([, config]) => {
    if (isFeatureEnabled(config.feature as keyof typeof FEATURES)) {
      activePermissions.push(...config.permissions)
    }
  })
  
  return activePermissions
}

// Función para verificar si un permiso está activo (basado en features)
export function isPermissionActive(permission: string): boolean {
  const activePermissions = getActivePermissions()
  return activePermissions.includes(permission)
}

// Función para obtener permisos de un módulo específico
export function getModulePermissions(module: string): string[] {
  const config = PERMISSIONS_CONFIG[module as keyof typeof PERMISSIONS_CONFIG]
  return config ? config.permissions : []
}

// Función para verificar si un módulo está habilitado
export function isModuleEnabled(module: string): boolean {
  const config = PERMISSIONS_CONFIG[module as keyof typeof PERMISSIONS_CONFIG]
  return config ? isFeatureEnabled(config.feature as keyof typeof FEATURES) : false
}

// Función para obtener módulos habilitados
export function getEnabledModules(): string[] {
  return Object.entries(PERMISSIONS_CONFIG)
    .filter(([_, config]) => isFeatureEnabled(config.feature as keyof typeof FEATURES))
    .map(([module, _]) => module)
}

// Función para validar permisos en tiempo de ejecución
export function validatePermissions(requiredPermissions: string[]): {
  isValid: boolean
  inactivePermissions: string[]
} {
  const activePermissions = getActivePermissions()
  const inactivePermissions: string[] = []
  
  requiredPermissions.forEach(permission => {
    if (!activePermissions.includes(permission)) {
      inactivePermissions.push(permission)
    }
  })
  
  return {
    isValid: inactivePermissions.length === 0,
    inactivePermissions
  }
}

// Hook para usar en componentes React
export function usePermissionValidation() {
  return {
    isFeatureEnabled,
    isPermissionActive,
    getActivePermissions,
    getModulePermissions,
    isModuleEnabled,
    getEnabledModules,
    validatePermissions
  }
}


