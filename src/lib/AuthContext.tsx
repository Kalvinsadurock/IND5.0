import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string | number;
  email: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department?: string;
  auth_user_id?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token');
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Ensure the client-side supabase instance has the auth token as well
          try {
            // Dynamically import to avoid circular dependency in Node/SSR
            const { supabase } = await import('@/shared/api/supabase');
            // Set the auth token on the client so storage calls are authenticated
            // @ts-ignore - setAuth is available on the client
            supabase.auth.setAuth && (supabase.auth as any).setAuth(token);
          } catch (e) {
            // ignore if supabase client not available
          }

          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('auth_token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (employeeId: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Store token
      localStorage.setItem('auth_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);

      // Set token on Supabase client so subsequent storage calls are authenticated
      try {
        const { setSupabaseAuth } = await import('@/shared/api/supabase');
        setSupabaseAuth(data.access_token);
      } catch (e) {
        // ignore if supabase client not available
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const checkAuth = async (): Promise<boolean> => {
    if (!token) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.valid) {
        setUser(data.user);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isLoggedIn: !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
