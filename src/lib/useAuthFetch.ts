import { useAuth } from './AuthContext';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Custom hook to make authenticated API calls
 * Automatically includes the JWT token in the Authorization header
 */
export function useAuthFetch() {
  const { token } = useAuth();

  return async <T = any>(
    url: string,
    options?: FetchOptions
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        throw new Error('Unauthorized - please log in again');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  };
}
