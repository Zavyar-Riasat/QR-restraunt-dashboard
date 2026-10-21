import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-ref')
);

if (!isConfigured) {
  console.info(
    'Running in Local Interactive Sandbox mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env when you are ready to connect live Supabase tables.'
  );
}

// Fallback to valid URL structure if not provided so @supabase/supabase-js does not crash during import
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = () => isConfigured;
export { isConfigured };
