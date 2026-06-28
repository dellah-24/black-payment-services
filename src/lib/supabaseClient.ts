/**
 * Shared Supabase Client
 * Single instance to avoid multiple GoTrueClient warnings.
 *
 * The client is intentionally build-safe: Cloudflare Pages does not provide
 * deployment secrets during static prerender, so the app must compile even when
 * NEXT_PUBLIC_SUPABASE_* is missing. Runtime operations return a clear
 * Supabase-style error until the production variables are configured.
 */

import { createClient, SupabaseClient, type Session } from '@supabase/supabase-js';
import { getEnv, isProduction } from './env';
import { logger } from './logger';

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    },
  });
}

const missingSupabaseError = {
  code: 'MISSING_SUPABASE_CONFIG',
  message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before using authentication or database features.',
  status: 500,
};

type AuthSessionResult = Awaited<ReturnType<SupabaseClient['auth']['getSession']>>;

function missingResult<T = null>(): Promise<{ data: T; error: typeof missingSupabaseError }> {
  return Promise.resolve({ data: null as T, error: missingSupabaseError });
}

function missingAuthSessionResult(): Promise<AuthSessionResult> {
  return Promise.resolve({
    data: { session: null, user: null },
    error: missingSupabaseError,
  } as unknown as AuthSessionResult);
}

export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

function createFallbackQuery() {
  const query = {
    eq: () => query,
    neq: () => query,
    in: () => query,
    order: () => query,
    lt: () => query,
    lte: () => query,
    gt: () => query,
    gte: () => query,
    like: () => query,
    ilike: () => query,
    is: () => query,
    or: () => query,
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    maybeSingle: () => missingResult(),
    single: () => missingResult(),
  };

  return query;
}

function createFallbackSupabaseClient(): SupabaseClient {
  const auth = {
    getSession: () => missingAuthSessionResult(),
    getUser: () => missingResult<null>(),
    signUp: () => missingResult<null>(),
    signInWithPassword: () => missingResult<null>(),
    signInWithOtp: () => missingResult<null>(),
    signInAnonymously: () => missingResult<null>(),
    signOut: () => missingResult<void>(),
    resetPasswordForEmail: () => missingResult<null>(),
    updateUser: () => missingResult<null>(),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
    }),
  };

  const from = () => createFallbackQuery();

  return {
    auth,
    from,
  } as unknown as SupabaseClient;
}

function createConfiguredSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (url && key) {
    supabaseClient = createConfiguredSupabaseClient(url, key);
    return supabaseClient;
  }

  return createFallbackSupabaseClient();
}

export const supabase: SupabaseClient = supabaseClient ?? createFallbackSupabaseClient();

export const supabaseAuth = supabase;

export function isSupabaseConfigured(): boolean {
  logger.debug('[Supabase] Checking configuration', {
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 12)}...` : undefined,
    isConfigured,
    isProduction: isProduction(),
  });
  return Boolean(supabaseClient);
}

export function getSupabaseConfigStatus(): { configured: boolean; url: string | undefined; hasAnonKey: boolean } {
  return {
    configured: Boolean(supabaseClient),
    url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    hasAnonKey: Boolean(getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
  };
}
