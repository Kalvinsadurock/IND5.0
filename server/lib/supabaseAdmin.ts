import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase admin client not configured: check SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL/SUPABASE_URL');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function getPublicOrSignedUrl(bucket: string, path: string, expiresSeconds = 60 * 60) {
  try {
    const pub = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || '';
    if (publicUrl) return { url: publicUrl, type: 'public' };

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresSeconds);
    if (error) return { url: '', error };
    return { url: (data as any)?.signedUrl || '', type: 'signed' };
  } catch (err) {
    return { url: '', error: err };
  }
}
