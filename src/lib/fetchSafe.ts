/**
 * Safe fetch wrapper that handles 404s and network errors gracefully
 * Returns defaultValue instead of throwing errors
 * 
 * @param url - The URL to fetch
 * @param defaultValue - Value to return if fetch fails (default: null)
 * @returns Promise resolving to JSON data or defaultValue
 */
export const fetchSafe = async <T = any>(
    url: string,
    defaultValue: T | null = null
): Promise<T | null> => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Endpoint not available (HTTP ${response.status}): ${url}`);
            return defaultValue;
        }

        return await response.json();
    } catch (error) {
        console.warn(`Failed to fetch ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        return defaultValue;
    }
};

/**
 * Safe fetch wrapper for POST requests with body
 * 
 * @param url - The URL to fetch
 * @param body - Request body (will be JSON stringified)
 * @param defaultValue - Value to return if fetch fails
 * @returns Promise resolving to JSON data or defaultValue
 */
export const fetchSafePost = async <T = any>(
    url: string,
    body: any,
    defaultValue: T | null = null
): Promise<T | null> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`POST request failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        throw error; // Re-throw for POST errors so caller can handle
    }
};
