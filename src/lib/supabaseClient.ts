/**
 * Shared Supabase Client - Lazy Initialization
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance
 * This lazy initialization prevents errors during build when env vars aren't available
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // For build time, return a mock client that will work when env vars are available at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    // Return a minimal client that won't crash during build
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });

  return supabaseInstance;
}

// Export the supabase client as a getter for backward compatibility
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return () => getSupabaseClient()[prop];
  },
  apply(_target, _thisArg, args) {
    return getSupabaseClient()(...args);
  }
});

// Re-export for auth operations
export const supabaseAuth: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return () => getSupabaseClient()[prop];
  },
  apply(_target, _thisArg, args) {
    return getSupabaseClient()(...args);
  }
});
