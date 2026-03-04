/**
 * Utility to extract error messages from API responses.
 */
export const getErrorMessage = (error: unknown, fallback: string = 'Error desconocido'): string => {
    if (!error || typeof error !== 'object') {
        return fallback;
    }

    const err = error as {
        message?: string;
        response?: {
            data?: unknown;
        };
    };

    const responseData = err.response?.data;

    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
        const message = (responseData as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message;
        }
    }

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
        return responseData;
    }

    if (typeof err.message === 'string' && err.message.trim().length > 0) {
        return err.message;
    }

    return fallback;
};
