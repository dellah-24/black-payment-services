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
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          country?: string | null;
          nationality?: string | null;
          state?: string | null;
          city?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          username?: string | null;
          avatar_url?: string | null;
          kyc_level?: number;
          kyc_status?: 'none' | 'pending' | 'approved' | 'rejected';
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          country?: string | null;
          nationality?: string | null;
          state?: string | null;
          city?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          username?: string | null;
          avatar_url?: string | null;
          kyc_level?: number;
          kyc_status?: 'none' | 'pending' | 'approved' | 'rejected';
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          country?: string | null;
          nationality?: string | null;
          state?: string | null;
          city?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
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
      encrypted_wallets: {
        Row: {
          id: string;
          wallet_address: string;
          encrypted_private_key: string;
          encrypted_mnemonic: string | null;
          encryption_iv: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          encrypted_private_key: string;
          encrypted_mnemonic?: string | null;
          encryption_iv: string;
        };
        Update: {
          wallet_address?: string;
          encrypted_private_key?: string;
          encrypted_mnemonic?: string | null;
          encryption_iv?: string;
        };
      };
      user_reputation: {
        Row: {
          id: string;
          user_id: string;
          rating: number;
          total_trades: number;
          successful_trades: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rating?: number;
          total_trades?: number;
          successful_trades?: number;
        };
        Update: {
          rating?: number;
          total_trades?: number;
          successful_trades?: number;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          trade_id: string;
          sender_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trade_id: string;
          sender_id: string;
          message: string;
        };
        Update: {
          message?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          trade_id: string;
          opened_by: string;
          reason: string;
          status: 'open' | 'resolved' | 'closed';
          resolution: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trade_id: string;
          opened_by: string;
          reason: string;
          status?: 'open' | 'resolved' | 'closed';
          resolution?: string | null;
        };
        Update: {
          status?: 'open' | 'resolved' | 'closed';
          resolution?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Record<string, any>;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, any>;
          read?: boolean;
        };
        Update: {
          read?: boolean;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          language: string;
          currency: string;
          notifications_enabled: boolean;
          two_factor_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          language?: string;
          currency?: string;
          notifications_enabled?: boolean;
          two_factor_enabled?: boolean;
        };
        Update: {
          language?: string;
          currency?: string;
          notifications_enabled?: boolean;
          two_factor_enabled?: boolean;
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
    global: {
      headers: {
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
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
      global: {
        headers: {
          'Accept': 'application/json',
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

export const supabase: SupabaseClient<Database> = supabaseClient || getSupabaseClient();

export function createSupabaseClient(): SupabaseClient<Database> {
  return getSupabaseClient();
}
