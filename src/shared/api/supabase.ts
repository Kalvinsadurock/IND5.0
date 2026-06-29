import { createClient } from '@supabase/supabase-js'

// Read Vite env vars so the client uses the same Supabase project as the server
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase client will be in demo/unconfigured mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// default export for modules that expect it
export default supabase;

// Helper to set auth token on the client-side supabase instance.
// This is useful to ensure storage calls use the same bearer token the server issued.
export function setSupabaseAuth(token: string | null) {
  try {
    if (!token) {
      // @ts-ignore
      supabase.auth.setAuth && (supabase.auth as any).setAuth('');
      return;
    }
    // @ts-ignore
    supabase.auth.setAuth && (supabase.auth as any).setAuth(token);
  } catch (e) {
    // ignore errors in environments where auth isn't available
    // eslint-disable-next-line no-console
    console.warn('Failed to set Supabase auth token on client:', e);
  }
}
