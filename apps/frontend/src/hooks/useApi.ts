import { useCallback, useState } from "react";
import api from "../lib/api";
// Import Axios specific types for better type safety
import type { AxiosRequestConfig, Method as AxiosMethod, ResponseType } from 'axios';

const cacheStore = new Map();

export type ApiParams = {
  method: AxiosMethod; // Use Axios Method type
  url:string;
  params?: any;
  data?: any;
  headers?: any;
  responseType?: ResponseType; // Use Axios ResponseType
  signal?: AbortSignal; // For request cancellation
};

export default function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any | null>(null); // Explicitly type error state

    const request = useCallback(async ({ method, url, data, params, headers, responseType, signal }: ApiParams) => {
        setLoading(true);
        setError(null);        try {
            // Construct Axios config explicitly for clarity and type safety
            const config: AxiosRequestConfig = {
                method,
                url,
                data,
                params,
                headers,
                responseType,
                ...(signal && { signal }), // Only include signal if it's defined
            };
            const response = await api(config);
            return response.data;
        } catch (err: any) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                // Error will be re-thrown, component can check err.name if specific handling is needed
            } else {
                const errorMessage = err?.response?.data?.message ||
                                   err?.response?.data ||
                                   err?.message ||
                                   "Error desconocido";
                setError(errorMessage);
            }
            throw err; // Re-throw the error so the calling component is aware
        } finally {
            setLoading(false);
        }
    }, []);

    const cachedRequest = useCallback(async (params: ApiParams) => {
        // Include params in cacheKey if they change the response, for simplicity keeping it as method-url
        const cacheKey = `${params.method}-${params.url}`;
        if (params.method === 'GET' && cacheStore.has(cacheKey)) {
            return cacheStore.get(cacheKey);
        }
        
        // Petición normal y almacenamiento en caché
        // The signal from params will be passed to the request function
        const response = await request(params);
        if (params.method === 'GET') {
            // The request function throws on error (including abort), 
            // so if we reach here, the request was successful and not aborted.
            cacheStore.set(cacheKey, response);
        }
        return response;
    }, [request]); // Add request to dependency array

    return { request, cachedRequest, loading, error };
}
