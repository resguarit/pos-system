/**
 * Constantes para mensajes de error comunes
 * Evita violaciones del principio DRY
 */

export const ERROR_MESSAGES = {
  // Errores de búsqueda
  SEARCH_PRODUCTS: 'Error al buscar productos',
  SEARCH_CATEGORIES: 'Error al buscar categorías',
  SEARCH_SUPPLIERS: 'Error al buscar proveedores',
  
  // Errores de actualización
  UPDATE_PRICES: 'Error al actualizar precios',
  UPDATE_PRODUCT: 'Error al actualizar el producto',
  UPDATE_PROFILE: 'Error al actualizar el perfil',
  UPDATE_PASSWORD: 'Error al actualizar la contraseña',
  UPDATE_EXCHANGE_RATE: 'Error al actualizar la cotización',
  
  // Errores de creación
  CREATE_PRODUCT: 'Error al crear el producto',
  CREATE_CATEGORY: 'Error al crear la categoría',
  CREATE_SUPPLIER: 'Error al crear el proveedor',
  CREATE_CUSTOMER: 'Error al crear el cliente',
  CREATE_BRANCH: 'Error al crear la sucursal',
  
  // Errores de eliminación
  DELETE_PRODUCT: 'Error al eliminar el producto',
  DELETE_CATEGORY: 'Error al eliminar la categoría',
  DELETE_SUPPLIER: 'Error al eliminar el proveedor',
  DELETE_CUSTOMER: 'Error al eliminar el cliente',
  DELETE_BRANCH: 'Error al eliminar la sucursal',
  
  // Errores de validación
  INVALID_VALUE: 'Por favor ingresa un valor válido',
  INVALID_PERCENTAGE: 'El porcentaje debe estar entre -100% y 1000%',
  SELECT_PRODUCTS: 'Selecciona al menos un producto para actualizar',
  REQUIRED_FIELD: 'Este campo es obligatorio',
  
  // Errores de conexión
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  TIMEOUT_ERROR: 'La operación tardó demasiado. Intenta nuevamente.',
  
  // Errores de permisos
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción',
  UNAUTHORIZED: 'Sesión expirada. Inicia sesión nuevamente.',
  
  // Errores genéricos
  UNKNOWN_ERROR: 'Error desconocido',
  OPERATION_FAILED: 'La operación falló',
} as const;

export const SUCCESS_MESSAGES = {
  // Mensajes de éxito de actualización
  PRICES_UPDATED: 'Precios actualizados correctamente',
  PRODUCT_UPDATED: 'Producto actualizado correctamente',
  PROFILE_UPDATED: 'Perfil actualizado correctamente',
  PASSWORD_UPDATED: 'Contraseña actualizada correctamente',
  EXCHANGE_RATE_UPDATED: 'Cotización actualizada correctamente',
  
  // Mensajes de éxito de creación
  PRODUCT_CREATED: 'Producto creado correctamente',
  CATEGORY_CREATED: 'Categoría creada correctamente',
  SUPPLIER_CREATED: 'Proveedor creado correctamente',
  CUSTOMER_CREATED: 'Cliente creado correctamente',
  BRANCH_CREATED: 'Sucursal creada correctamente',
  
  // Mensajes de éxito de eliminación
  PRODUCT_DELETED: 'Producto eliminado correctamente',
  CATEGORY_DELETED: 'Categoría eliminada correctamente',
  SUPPLIER_DELETED: 'Proveedor eliminado correctamente',
  CUSTOMER_DELETED: 'Cliente eliminado correctamente',
  BRANCH_DELETED: 'Sucursal eliminada correctamente',
} as const;

export const WARNING_MESSAGES = {
  // Advertencias de validación
  SOME_PRODUCTS_FAILED: 'Algunos productos no se pudieron actualizar',
  INVALID_DATA: 'Algunos datos son inválidos',
  PARTIAL_SUCCESS: 'La operación se completó parcialmente',
  
  // Advertencias de confirmación
  CONFIRM_DELETE: '¿Estás seguro de que quieres eliminar este elemento?',
  CONFIRM_BULK_DELETE: '¿Estás seguro de que quieres eliminar los elementos seleccionados?',
  CONFIRM_BULK_UPDATE: '¿Estás seguro de que quieres actualizar los elementos seleccionados?',
  
  // Advertencias de estado
  UNSAVED_CHANGES: 'Tienes cambios sin guardar',
  SESSION_EXPIRING: 'Tu sesión está por expirar',
} as const;

export const INFO_MESSAGES = {
  // Información de estado
  LOADING: 'Cargando...',
  PROCESSING: 'Procesando...',
  SAVING: 'Guardando...',
  UPDATING: 'Actualizando...',
  DELETING: 'Eliminando...',
  
  // Información de resultados
  NO_RESULTS: 'No se encontraron resultados',
  NO_PRODUCTS: 'No hay productos disponibles',
  NO_CATEGORIES: 'No hay categorías disponibles',
  NO_SUPPLIERS: 'No hay proveedores disponibles',
  
  // Información de ayuda
  SELECT_FILTERS: 'Selecciona filtros para buscar',
  SELECT_ITEMS: 'Selecciona elementos para continuar',
  ENTER_VALUE: 'Ingresa un valor para continuar',
} as const;

/**
 * Función helper para obtener mensajes de error con fallback
 */
export const getErrorMessage = (
  error: any, 
  defaultMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR
): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return defaultMessage;
};

/**
 * Función helper para obtener mensajes de éxito con contexto
 */
export const getSuccessMessage = (
  action: string,
  count?: number
): string => {
  const baseMessage = SUCCESS_MESSAGES[action as keyof typeof SUCCESS_MESSAGES];
  if (!baseMessage) return SUCCESS_MESSAGES.PRODUCT_UPDATED;
  
  if (count && count > 1) {
    return `${count} elementos ${baseMessage.toLowerCase()}`;
  }
  
  return baseMessage;
};



