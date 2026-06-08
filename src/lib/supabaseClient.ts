/**
 * Shared Supabase Client
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Get env vars - works in both SSR and client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured (not just present but valid)
const isConfigured = !!(supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key'));

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

// Get the client - fail fast if not configured
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // SSR or client without config - try to get env vars now
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if properly configured (not placeholders)
  const isValidConfig = !!(url && key &&
    !url.includes('your-project') &&
    !key.includes('your-anon-key'));
  
  if (isValidConfig) {
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
  
  // No config - throw error in production
  throw new Error(
    'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

// Export supabase directly
export const supabase: SupabaseClient = getSupabaseClient();

export const supabaseAuth = supabase;

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  logger.debug('[Supabase] Checking configuration', { supabaseUrl, supabaseAnonKey: supabaseAnonKey?.substring(0, 20) + '...', isConfigured });
  return isConfigured;
}
