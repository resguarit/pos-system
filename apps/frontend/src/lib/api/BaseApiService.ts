/**
 * Clase base para servicios de API que maneja respuestas de manera consistente
 * Aplica principios SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 */
export abstract class BaseApiService {
  /**
   * Maneja respuestas de la API de manera consistente
   * Extrae automáticamente los datos del formato estándar de Laravel
   * 
   * @param response - Respuesta de axios
   * @returns Datos extraídos de la respuesta
   */
  protected static handleResponse<T>(response: any): T {
    try {
      // Estructura estándar de Laravel: { data: { data: [...] } }
      if (response.data?.data?.data !== undefined) {
        return response.data.data.data;
      }
      
      // Estructura simple: { data: [...] }
      if (response.data?.data !== undefined) {
        return response.data.data;
      }
      
      // Respuesta directa
      return response.data;
    } catch (error) {
      console.error('Error processing API response:', error);
      throw new Error('Error al procesar la respuesta del servidor');
    }
  }

  /**
   * Maneja errores de API de manera consistente
   * 
   * @param error - Error de axios
   * @param defaultMessage - Mensaje por defecto
   * @throws Error procesado
   */
  protected static handleError(error: any, defaultMessage: string = 'Error en la operación'): never {
    const message = error?.response?.data?.message || 
                   error?.message || 
                   defaultMessage;
    
    console.error('API Error:', {
      message,
      status: error?.response?.status,
      data: error?.response?.data
    });
    
    throw new Error(message);
  }

  /**
   * Valida que los datos sean del tipo esperado
   * 
   * @param data - Datos a validar
   * @param expectedType - Tipo esperado ('array', 'object', etc.)
   * @param fieldName - Nombre del campo para mensajes de error
   */
  protected static validateDataType(data: any, expectedType: string, fieldName: string): void {
    if (expectedType === 'array' && !Array.isArray(data)) {
      throw new Error(`${fieldName} debe ser un array`);
    }
    
    if (expectedType === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
      throw new Error(`${fieldName} debe ser un objeto`);
    }
  }
}
