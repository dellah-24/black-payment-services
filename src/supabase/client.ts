/**
 * Supabase Client & Database Schema
 * BlackPayments Wallet - Backend Database Integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get env vars at runtime
function getEnvVar(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (process.env as any)[key];
}

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          wallet_address: string;
          username: string | null;
          avatar_url: string | null;
          kyc_level: number;
          kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          username?: string | null;
          avatar_url?: string | null;
          kyc_level?: number;
          kyc_status?: 'none' | 'pending' | 'approved' | 'rejected';
        };
        Update: {
          id?: string;
          wallet_address?: string;
          username?: string | null;
          avatar_url?: string | null;
          kyc_level?: number;
          kyc_status?: 'none' | 'pending' | 'approved' | 'rejected';
        };
      };
      p2p_orders: {
        Row: {
          id: string;
          user_id: string;
          type: 'buy' | 'sell';
          token: string;
          chain: string;
          amount: string;
          filled_amount: string;
          price: string;
          fiat_currency: string;
          payment_methods: string[];
          min_amount: string;
          max_amount: string;
          time_limit: number;
          status: 'pending' | 'active' | 'partially_filled' | 'filled' | 'cancelled' | 'expired';
          terms: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'buy' | 'sell';
          token?: string;
          chain?: string;
          amount: string;
          filled_amount?: string;
          price: string;
          fiat_currency: string;
          payment_methods?: string[];
          min_amount?: string;
          max_amount?: string;
          time_limit?: number;
          status?: 'pending' | 'active' | 'partially_filled' | 'filled' | 'cancelled' | 'expired';
          terms?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'buy' | 'sell';
          token?: string;
          chain?: string;
          amount?: string;
          filled_amount?: string;
          price?: string;
          fiat_currency?: string;
          payment_methods?: string[];
          min_amount?: string;
          max_amount?: string;
          time_limit?: number;
          status?: 'pending' | 'active' | 'partially_filled' | 'filled' | 'cancelled' | 'expired';
          terms?: string;
        };
      };
      p2p_trades: {
        Row: {
          id: string;
          order_id: string;
          maker_id: string;
          taker_id: string | null;
          type: 'buy' | 'sell';
          token: string;
          chain: string;
          amount: string;
          price: string;
          fiat_amount: string;
          fiat_currency: string;
          payment_method: string;
          status: 'created' | 'waiting_payment' | 'paid' | 'released' | 'refunded' | 'disputed';
          maker_payment_details: string | null;
          taker_payment_details: string | null;
          maker_confirmed_at: string | null;
          taker_confirmed_at: string | null;
          released_at: string | null;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          maker_id: string;
          taker_id?: string | null;
          type: 'buy' | 'sell';
          token?: string;
          chain?: string;
          amount: string;
          price: string;
          fiat_amount: string;
          fiat_currency: string;
          payment_method: string;
          status?: 'created' | 'waiting_payment' | 'paid' | 'released' | 'refunded' | 'disputed';
        };
        Update: {
          order_id?: string;
          maker_id?: string;
          taker_id?: string | null;
          type?: 'buy' | 'sell';
          token?: string;
          chain?: string;
          amount?: string;
          price?: string;
          fiat_amount?: string;
          fiat_currency?: string;
          payment_method?: string;
          status?: 'created' | 'waiting_payment' | 'paid' | 'released' | 'refunded' | 'disputed';
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'send' | 'receive' | 'p2p_buy' | 'p2p_sell' | 'swap' | 'stake' | 'unstake';
          token: string;
          chain: string;
          amount: string;
          fee: string;
          hash: string;
          status: 'pending' | 'confirmed' | 'failed';
          to_address: string | null;
          from_address: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: 'send' | 'receive' | 'p2p_buy' | 'p2p_sell' | 'swap' | 'stake' | 'unstake';
          token: string;
          chain: string;
          amount: string;
          fee?: string;
          hash: string;
          status?: 'pending' | 'confirmed' | 'failed';
          to_address?: string | null;
          from_address?: string | null;
        };
        Update: {
          status?: 'pending' | 'confirmed' | 'failed';
        };
      };
    };
  };
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const isConfigured = supabaseUrl && supabaseAnonKey;

// Create client at module load in browser only
let supabaseClient: SupabaseClient<Database> | null = null;

if (isConfigured) {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // Try to get env vars now
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (url && key) {
    supabaseClient = createClient<Database>(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return supabaseClient;
  }
  
  // No config - return dummy client
  return createClient<Database>('https://placeholder.supabase.co', 'placeholder', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabase: SupabaseClient<Database> = supabaseClient || getSupabaseClient();

export function createSupabaseClient(): SupabaseClient<Database> {
  return getSupabaseClient();
}
