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
    // Return a placeholder URL client
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

// Export backward compatible supabase - use getSupabaseClient() for direct access
// This object proxies to the client lazily
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
  from(table: string) {
    return getSupabaseClient().from(table);
  },
  auth: {
    getSession() {
      return getSupabaseClient().auth.getSession();
    },
    getUser() {
      return getSupabaseClient().auth.getUser();
    },
    signOut() {
      return getSupabaseClient().auth.signOut();
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      return getSupabaseClient().auth.onAuthStateChange(callback);
    },
    signInWithPassword(credentials: { email: string; password: string }) {
      return getSupabaseClient().auth.signInWithPassword(credentials);
    },
    signUp(credentials: { email: string; password: string }) {
      return getSupabaseClient().auth.signUp(credentials);
    },
  },
  channel(name: string) {
    return getSupabaseClient().channel(name);
  },
  removeChannel(channel: any) {
    return getSupabaseClient().removeChannel(channel);
  },
} as unknown as SupabaseClient;

// Re-export for auth operations
export const supabaseAuth = supabase;
