/**
 * Shared Supabase Client
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create client only in browser with valid credentials
const supabaseUrl = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const supabaseAnonKey = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;

const isConfigured = supabaseUrl && supabaseAnonKey;

// Create client at module load in browser only
let supabaseClient: SupabaseClient | null = null;

if (typeof window !== 'undefined' && isConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Get the client - fallback for SSR
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // SSR or client without config - return a dummy client
  return createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Export supabase directly - use getSupabaseClient() for guaranteed client
export const supabase: SupabaseClient = supabaseClient || getSupabaseClient();

export const supabaseAuth = supabase;
