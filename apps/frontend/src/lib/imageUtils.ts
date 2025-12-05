/**
 * Utility functions for handling system images
 */

/**
 * Resolves the full URL for a system image (logo, favicon, etc.)
 * Handles relative paths, default backend paths, and cache busting.
 * 
 * @param imageUrl - The URL or path from the configuration
 * @param defaultPath - The default path if no URL is provided (e.g., '/images/logo.jpg')
 * @returns The fully resolved URL ready to be used in an <img> tag
 */
export const resolveSystemImageUrl = (imageUrl: string | null | undefined, defaultPath: string = '/images/logo.jpg'): string => {
    // Determine the base URL for the API/Backend
    const apiBaseUrl = import.meta.env.VITE_API_URL ||
        (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8000/api');

    // Remove /api suffix to get the root URL of the API server
    const apiRootUrl = apiBaseUrl.replace(/\/api$/, '') ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

    // Check if we're in development mode (using vite dev server)
    const isDev = import.meta.env.DEV;

    let finalUrl = imageUrl;

    // 1. Handle empty or null values - use default from API
    if (!finalUrl || finalUrl.trim() === '') {
        if (isDev) {
            // In dev, use relative path to leverage Vite proxy
            finalUrl = defaultPath;
        } else {
            // In production, use full API URL
            finalUrl = `${apiRootUrl}${defaultPath}`;
        }
    } else {
        // 2. Handle URLs that contain /images/ or /storage/
        if (finalUrl.includes('/images/') || finalUrl.includes('/storage/')) {
            // Extract the path starting from /images or /storage
            const match = finalUrl.match(/(\/(images|storage)\/.*)/);
            if (match) {
                const path = match[1];
                if (isDev) {
                    // In dev, use relative path to leverage Vite proxy
                    finalUrl = path;
                } else {
                    // In production, use full API URL
                    finalUrl = `${apiRootUrl}${path}`;
                }
            }
        }
        // 3. Handle relative paths (that are not the default path)
        else if (!finalUrl.startsWith('http')) {
            // Ensure it has the correct base URL
            finalUrl = `${apiRootUrl.replace(/\/$/, '')}/${finalUrl.replace(/^\//, '')}`;
        }
        // 4. If it's already a full URL, use it as-is
    }

    // 5. Add cache busting for logo/favicon to ensure fresh images
    if (finalUrl.includes('logo.jpg') || finalUrl.includes('favicon.ico')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}t=${new Date().getTime()}`;
    }

    return finalUrl;
};
