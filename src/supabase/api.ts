/**
 * BlackPayments API - Supabase Service Layer
 */

import { supabase, Database } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];
type P2POrder = Database['public']['Tables']['p2p_orders']['Row'];
type P2PTrade = Database['public']['Tables']['p2p_trades']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type UserReputation = Database['public']['Tables']['user_reputation']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type Dispute = Database['public']['Tables']['disputes']['Row'];

/**
 * Encrypted Wallet API - Secure cloud storage for wallet credentials
 */
export const walletApi = {
  /**
   * Store encrypted wallet credentials
   */
  async storeEncryptedWallet(walletAddress: string, encryptedPrivateKey: string, encryptedMnemonic: string | null, encryptionIv: string): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('encrypted_wallets')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        encrypted_private_key: encryptedPrivateKey,
        encrypted_mnemonic: encryptedMnemonic,
        encryption_iv: encryptionIv,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  },

  /**
   * Get encrypted wallet by address
   */
  async getEncryptedWallet(walletAddress: string): Promise<{
    walletAddress: string;
    encryptedPrivateKey: string;
    encryptedMnemonic: string | null;
    encryptionIv: string;
  } | null> {
    const { data, error } = await supabase
      .from('encrypted_wallets')
      .select('wallet_address, encrypted_private_key, encrypted_mnemonic, encryption_iv')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      walletAddress: data.wallet_address,
      encryptedPrivateKey: data.encrypted_private_key,
      encryptedMnemonic: data.encrypted_mnemonic,
      encryptionIv: data.encryption_iv,
    };
  },

  /**
   * Check if wallet exists in cloud
   */
  async walletExists(walletAddress: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('encrypted_wallets')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    return !error && !!data;
  },

  /**
   * Delete wallet from cloud
   */
  async deleteWallet(walletAddress: string): Promise<void> {
    const { error } = await supabase
      .from('encrypted_wallets')
      .delete()
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) throw error;
  },
};

/**
 * Profile API
 */
export const profileApi = {
  /**
   * Get or create profile for wallet address
   */
  async getOrCreate(walletAddress: string): Promise<Profile> {
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!profile && !error) {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ wallet_address: walletAddress.toLowerCase() })
        .select()
        .single();

      if (createError) throw createError;
      profile = newProfile;

      // Create reputation entry
      await supabase
        .from('user_reputation')
        .insert({ user_id: profile.id });
    }

    if (error) throw error;
    return profile!;
  },

  /**
   * Update profile with personal details
   */
  async update(
    walletAddress: string, 
    updates: Partial<Pick<Profile, 
      | 'username' 
      | 'avatar_url' 
      | 'first_name' 
      | 'last_name' 
      | 'email' 
      | 'phone' 
      | 'date_of_birth' 
      | 'country' 
      | 'nationality' 
      | 'state' 
      | 'city' 
      | 'address_line1' 
      | 'address_line2' 
      | 'postal_code'
    >>
  ): Promise<Profile> {
    const profile = await this.getOrCreate(walletAddress);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get full profile by wallet address
   */
  async getByAddress(walletAddress: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Check if profile is complete (has required fields for KYC)
   */
  async isProfileComplete(walletAddress: string): Promise<boolean> {
    const profile = await this.getByAddress(walletAddress);
    if (!profile) return false;
    
    return !!( 
      profile.first_name && 
      profile.last_name && 
      profile.email && 
      profile.date_of_birth && 
      profile.country && 
      profile.address_line1 && 
      profile.city && 
      profile.postal_code
    );
  },

  /**
   * Get profile completion percentage
   */
  async getCompletionPercentage(walletAddress: string): Promise<number> {
    const profile = await this.getByAddress(walletAddress);
    if (!profile) return 0;

    const fields = [
      profile.username,
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.phone,
      profile.date_of_birth,
      profile.country,
      profile.nationality,
      profile.state,
      profile.city,
      profile.address_line1,
      profile.postal_code,
    ];

    const filledCount = fields.filter(Boolean).length;
    return Math.round((filledCount / fields.length) * 100);
  },
};

/**
 * P2P Orders API
 */
export const ordersApi = {
  /**
   * Create new order
   */
  async create(order: {
    userId: string;
    type: 'buy' | 'sell';
    token?: string;
    chain?: string;
    amount: string;
    price: string;
    fiatCurrency: string;
    paymentMethods: string[];
    minAmount?: string;
    maxAmount?: string;
    timeLimit?: number;
    terms?: string;
  }): Promise<P2POrder> {
    const expiresAt = new Date(Date.now() + (order.timeLimit || 30) * 60 * 1000);

    const { data, error } = await supabase
      .from('p2p_orders')
      .insert({
        user_id: order.userId,
        type: order.type,
        token: order.token || 'USDT',
        chain: order.chain || 'tron',
        amount: order.amount,
        price: order.price,
        fiat_currency: order.fiatCurrency || 'USD',
        payment_methods: order.paymentMethods,
        min_amount: order.minAmount || order.amount,
        max_amount: order.maxAmount || order.amount,
        time_limit: order.timeLimit || 30,
        status: 'active',
        terms: order.terms || '',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get active orders
   */
  async getActive(filters?: {
    type?: 'buy' | 'sell';
    fiatCurrency?: string;
    chain?: string;
    paymentMethod?: string;
  }): Promise<P2POrder[]> {
    let query = supabase
      .from('p2p_orders')
      .select('*')
      .eq('status', 'active')
      .eq('expires_at', null, { foreignTableConfig: { type: 'gt', referent: 'now' } })
      .order('created_at', { ascending: false });

    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.fiatCurrency) query = query.eq('fiat_currency', filters.fiatCurrency);
    if (filters?.chain) query = query.eq('chain', filters.chain);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get user's orders
   */
  async getMyOrders(userId: string): Promise<P2POrder[]> {
    const { data, error } = await supabase
      .from('p2p_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cancel order
   */
  async cancel(orderId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('p2p_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

/**
 * P2P Trades API
 */
export const tradesApi = {
  /**
   * Create trade from order
   */
  async create(orderId: string, takerId: string, paymentMethod: string): Promise<P2PTrade> {
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('p2p_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Update order status
    await supabase
      .from('p2p_orders')
      .update({ 
        status: order.filled_amount === '0' ? 'partially_filled' : 'partially_filled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Create trade
    const { data, error } = await supabase
      .from('p2p_trades')
      .insert({
        order_id: orderId,
        maker_id: order.user_id,
        taker_id: takerId,
        type: order.type,
        token: order.token,
        chain: order.chain,
        amount: order.amount,
        price: order.price,
        fiat_amount: (BigInt(order.amount) * BigInt(order.price) / 100n).toString(),
        fiat_currency: order.fiat_currency,
        payment_method: paymentMethod,
        status: 'waiting_payment',
        expires_at: new Date(Date.now() + order.time_limit * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Confirm payment (taker)
   */
  async confirmPayment(tradeId: string, takerId: string, paymentDetails?: string): Promise<void> {
    const { error } = await supabase
      .from('p2p_trades')
      .update({
        status: 'paid',
        taker_confirmed_at: new Date().toISOString(),
        taker_payment_details: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('taker_id', takerId);

    if (error) throw error;
  },

  /**
   * Release crypto (maker)
   */
  async release(tradeId: string, makerId: string): Promise<void> {
    const { error } = await supabase
      .from('p2p_trades')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('maker_id', makerId);

    if (error) throw error;
  },

  /**
   * Get user's trades
   */
  async getMyTrades(userId: string): Promise<P2PTrade[]> {
    const { data, error } = await supabase
      .from('p2p_trades')
      .select('*')
      .or(`maker_id.eq.${userId},taker_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Subscribe to trade updates (real-time)
   */
  subscribe(tradeId: string, callback: (trade: P2PTrade) => void) {
    return supabase
      .channel(`trade:${tradeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'p2p_trades',
        filter: `id=eq.${tradeId}`,
      }, (payload) => {
        callback(payload.new as P2PTrade);
      })
      .subscribe();
  },
};

/**
 * Transactions API
 */
export const transactionsApi = {
  /**
   * Record transaction
   */
  async create(tx: {
    userId: string;
    type: Transaction['type'];
    token: string;
    chain: string;
    amount: string;
    fee?: string;
    hash: string;
    toAddress?: string;
    fromAddress?: string;
  }): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: tx.userId,
        type: tx.type,
        token: tx.token,
        chain: tx.chain,
        amount: tx.amount,
        fee: tx.fee || '0',
        hash: tx.hash,
        to_address: tx.toAddress,
        from_address: tx.fromAddress,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user's transactions
   */
  async getHistory(userId: string, limit = 50): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Update transaction status
   */
  async updateStatus(hash: string, status: Transaction['status']): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('hash', hash);

    if (error) throw error;
  },
};

/**
 * Chat API
 */
export const chatApi = {
  /**
   * Send message
   */
  async sendMessage(tradeId: string, senderId: string, content: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        trade_id: tradeId,
        sender_id: senderId,
        content,
        type: 'text',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get messages
   */
  async getMessages(tradeId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Subscribe to new messages (real-time)
   */
  subscribe(tradeId: string, callback: (message: ChatMessage) => void) {
    return supabase
      .channel(`chat:${tradeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `trade_id=eq.${tradeId}`,
      }, (payload) => {
        callback(payload.new as ChatMessage);
      })
      .subscribe();
  },
};

/**
 * Reputation API
 */
export const reputationApi = {
  /**
   * Get user reputation
   */
  async get(userId: string): Promise<UserReputation | null> {
    const { data, error } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};

/**
 * Disputes API
 */
export const disputesApi = {
  /**
   * Open dispute
   */
  async open(tradeId: string, userId: string, reason: string, description: string): Promise<Dispute> {
    const { data, error } = await supabase
      .from('disputes')
      .insert({
        trade_id: tradeId,
        opened_by: userId,
        reason,
        description,
      })
      .select()
      .single();

    if (error) throw error;

    // Update trade status
    await supabase
      .from('p2p_trades')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', tradeId);

    return data;
  },
};

export default {
  profile: profileApi,
  orders: ordersApi,
  trades: tradesApi,
  transactions: transactionsApi,
  chat: chatApi,
  reputation: reputationApi,
  disputes: disputesApi,
  wallet: walletApi,
};
