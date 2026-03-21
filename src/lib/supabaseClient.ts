/**
 * Shared Supabase Client
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get env vars - works in both SSR and client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = supabaseUrl && supabaseAnonKey;

// Create client at module load in browser only
let supabaseClient: SupabaseClient | null = null;

if (isConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    },
  });
}

// Get the client - fallback for SSR
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // SSR or client without config - try to get env vars now
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (url && key) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      },
    });
    return supabaseClient;
  }
  
  // No config - return dummy client
  return createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
    },
  });
}

// Export supabase directly
export const supabase: SupabaseClient = supabaseClient || getSupabaseClient();

export const supabaseAuth = supabase;
