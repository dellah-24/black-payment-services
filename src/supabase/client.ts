/**
 * Supabase Client & Database Schema
 * BlackPayments Wallet - Backend Database Integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface Database {
  public: {
    Tables: {
      // User profiles
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

      // P2P Orders
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

      // P2P Trades
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
          id?: string;
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

      // Disputes
      disputes: {
        Row: {
          id: string;
          trade_id: string;
          opened_by: string;
          reason: string;
          description: string;
          evidence: string[];
          status: 'open' | 'under_review' | 'maker_wins' | 'taker_wins' | 'cancelled';
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          trade_id: string;
          opened_by: string;
          reason: string;
          description: string;
          evidence?: string[];
          status?: 'open' | 'under_review' | 'maker_wins' | 'taker_wins' | 'cancelled';
        };
        Update: {
          status?: 'open' | 'under_review' | 'maker_wins' | 'taker_wins' | 'cancelled';
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
      };

      // User Reputation
      user_reputation: {
        Row: {
          user_id: string;
          trade_count: number;
          total_volume: string;
          completion_rate: number;
          avg_release_time: number;
          rating: number;
          review_count: number;
          positive_reviews: number;
          negative_reviews: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          trade_count?: number;
          total_volume?: string;
          completion_rate?: number;
          avg_release_time?: number;
          rating?: number;
          review_count?: number;
          positive_reviews?: number;
          negative_reviews?: number;
        };
        Update: {
          trade_count?: number;
          total_volume?: string;
          completion_rate?: number;
          avg_release_time?: number;
          rating?: number;
          review_count?: number;
          positive_reviews?: number;
          negative_reviews?: number;
        };
      };

      // Transactions history
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

      // Chat messages
      chat_messages: {
        Row: {
          id: string;
          trade_id: string;
          sender_id: string;
          content: string;
          type: 'text' | 'image' | 'system';
          created_at: string;
        };
        Insert: {
          trade_id: string;
          sender_id: string;
          content: string;
          type?: 'text' | 'image' | 'system';
        };
        Update: {
          content?: string;
        };
      };

      // Reviews
      reviews: {
        Row: {
          id: string;
          trade_id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          trade_id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
      };

      // Encrypted Wallets
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
          wallet_address: string;
          encrypted_private_key: string;
          encrypted_mnemonic?: string | null;
          encryption_iv: string;
        };
        Update: {
          encrypted_private_key?: string;
          encrypted_mnemonic?: string | null;
          encryption_iv?: string;
          updated_at?: string;
        };
      };
    };
  };
}

/**
 * Supabase client configuration
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Create Supabase client
 */
export function createSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Lazy client initialization
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client instance - lazy initialization
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured during build');
  }
  
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  
  return supabaseInstance;
}

// Export backward compatible supabase
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
} as unknown as SupabaseClient<Database>;

export { createSupabaseClient };
