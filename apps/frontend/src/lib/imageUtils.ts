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

    // Remove /api suffix to get the root URL
    const baseUrl = apiBaseUrl.replace(/\/api$/, '') ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

    let finalUrl = imageUrl;

    // 1. Handle empty or null values
    if (!finalUrl || finalUrl.trim() === '') {
        finalUrl = `${baseUrl}${defaultPath}`;
    } else {
        // 2. Handle specific backend paths that should be proxied
        // If the URL points to /images/ or /storage/, force it to be relative
        // to use the frontend proxy (avoids CORS/port issues in dev)
        if (finalUrl.includes('/images/') || finalUrl.includes('/storage/')) {
            // Extract the path starting from /images or /storage
            const match = finalUrl.match(/(\/(images|storage)\/.*)/);
            if (match) {
                finalUrl = match[1];
            }
        }
        // 3. Handle relative paths (that are not the default path)
        else if (!finalUrl.startsWith('http')) {
            // Ensure it has the correct base URL
            // Avoid double slashes
            finalUrl = `${baseUrl.replace(/\/$/, '')}/${finalUrl.replace(/^\//, '')}`;
        }
    }

    // 4. Add cache busting for default images or if it looks like a static file
    // This ensures that if the user overwrites 'logo.jpg', the browser fetches the new version
    if (finalUrl.includes('logo.jpg') || finalUrl.includes('favicon.ico')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}t=${new Date().getTime()}`;
    }

    return finalUrl;
};
