import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

let adminClient: SupabaseClient | null = null;

export function getCustodialSupabaseClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for custodial operations.');
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apiKey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation',
      },
    },
  });

  return adminClient;
}
