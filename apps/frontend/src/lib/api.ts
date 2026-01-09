import axios from 'axios';
import { getAuthToken } from './auth';
import { apiUrl } from './api/config';

const base = apiUrl;

const api = axios.create({
  baseURL: String(base).replace(/\/$/, ''),
  headers: {
    'Accept': 'application/json',
  }
});

api.interceptors.request.use(
  (config) => {
    // Primero, obtenemos el token de localStorage.
    const token = getAuthToken();

    // Si el token existe, lo añadimos a los encabezados de la petición.
    // Esta es la parte más importante.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Scope por sucursales seleccionadas solo en endpoints que lo requieren
    const isGet = (config.method || '').toLowerCase() === 'get';
    const urlStr = (config.baseURL || api.defaults.baseURL || '') + (config.url || '');
    let path = config.url || '';
    try {
      path = new URL(urlStr).pathname; // Normaliza a pathname
    } catch (_) {
      // fallback: usar config.url tal cual
    }

    const isAuthOrProfile = path.endsWith('/profile') || path.includes('/auth/');

    const shouldAttachBranch = (p: string) => {
      // Allowlist de endpoints GET que dependen de sucursal
      const allowList = [
        /^\/sales\/?$/,                    // listado base
        /^\/sales\/summary\/?$/,          // resumen de ventas
        /^\/sales\/global\/?$/,           // ventas globales filtrables por sucursales
        /^\/sales\/global\/summary\/?$/, // resumen global filtrable
        /^\/sales\/global\/history\/?$/, // histórico global filtrable
        /^\/stocks(\/|$)/,                // inventario/alertas de stock
        /^\/dashboard\//                  // widgets del dashboard
      ];
      return allowList.some((rx) => rx.test(p));
    };

    if (isGet && !isAuthOrProfile && shouldAttachBranch(path)) {
      const storedIdsRaw = localStorage.getItem('selectedBranchIds');
      const legacyId = localStorage.getItem('selectedBranchId');

      let ids: string[] = [];
      try {
        if (storedIdsRaw) {
          const parsed = JSON.parse(storedIdsRaw);
          if (Array.isArray(parsed)) {
            ids = parsed.map((x) => (x != null ? String(x) : '')).filter(Boolean);
          }
        }
      } catch (_) {
        // ignore JSON errors
      }

      if (!ids.length && legacyId) {
        ids = [String(legacyId)];
      }

      if (ids.length) {
        config.params = config.params || {};
        const hasBranchParam =
          Object.prototype.hasOwnProperty.call(config.params, 'branch_id') ||
          Object.prototype.hasOwnProperty.call(config.params, 'branch_id[]');

        if (!hasBranchParam) {
          // Enviar como arreglo para soportar multi-sucursal
          config.params['branch_id[]'] = ids;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para manejar errores 401 (token revocado/expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o revocado - limpiar sesión y redirigir a login
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        localStorage.clear();
        // Redirigir a login (evitar loop infinito si ya estamos en login)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;