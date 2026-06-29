import { createClient } from "@supabase/supabase-js";
import { Request, Response, NextFunction } from "express";

// Initialize Supabase client with service role key for auth operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Check if running in demo mode (no Supabase credentials)
const isDemoMode = !supabaseUrl || !supabaseAnonKey;

if (isDemoMode) {
  console.warn("⚠️  DEMO MODE: Supabase not configured. Auth will work with demo credentials only.");
  console.warn("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real authentication.");
}

// Client for verifying tokens (uses anon key)
export const supabasePublic = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Client for admin operations (uses service role key)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: app.use(requireAuth)
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    if (!supabasePublic) {
      return res.status(500).json({ error: "Auth service not configured" });
    }

    // Verify the token
    const {
      data: { user },
      error,
    } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Sign in with email and password
 * Returns JWT token
 * In demo mode, accepts any password for testing
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ access_token: string; user: AuthUser } | { error: string }> {
  // Demo mode: accept any employee with password "demo"
  if (isDemoMode) {
    if (password !== "demo") {
      return { error: "Invalid password. Use 'demo' for testing." };
    }
    
    // Generate a fake JWT for testing
    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ email, iat: Date.now() }))}.fake`;
    return {
      access_token: fakeToken,
      user: {
        id: `demo-${email}`,
        email,
      },
    };
  }

  if (!supabasePublic) {
    return { error: "Auth service not configured" };
  }

  const { data, error } = await supabasePublic.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { error: "No session created" };
  }

  return {
    access_token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
    },
  };
}

/**
 * Get user by email (for mapping employee to auth user)
 */
export async function getUserByEmail(email: string) {
  if (!supabaseAdmin) {
    throw new Error("Auth service not configured");
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return data.users.find((user) => user.email === email);
}

/**
 * Create a new auth user (for initial employee setup)
 */
export async function createAuthUser(
  email: string,
  password: string,
  userMetadata?: Record<string, any>
) {
  if (!supabaseAdmin) {
    throw new Error("Auth service not configured");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  return data.user;
}

/**
 * Verify token and return user
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  // Demo mode: accept demo tokens
  if (isDemoMode) {
    if (token.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          id: `demo-${payload.email}`,
          email: payload.email,
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  if (!supabasePublic) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabasePublic.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || "",
    user_metadata: user.user_metadata,
  };
}
