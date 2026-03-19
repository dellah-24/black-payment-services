/**
 * Shared Supabase Client
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single shared client instance
// This avoids the "Multiple GoTrueClient instances detected" warning
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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

// Re-export supabaseAuth as the same instance to avoid creating multiple clients
// Use this for auth operations - it's the same as supabase
export const supabaseAuth: SupabaseClient = supabase;
