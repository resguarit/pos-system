const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Obtiene el token de autenticación desde el localStorage.
 * @returns El token como string, o null si no se encuentra.
 */
export const getAuthToken = (): string | null => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token;
};

/**
 * Guarda el token de autenticación en el localStorage.
 * @param token - El token a guardar.
 */
export const saveAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

/**
 * Elimina el token de autenticación del localStorage.
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};