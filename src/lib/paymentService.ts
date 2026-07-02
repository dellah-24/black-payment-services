import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getChainConfig, getPrimaryRpcUrl, getUsdtAddress, ChainKey } from '@/config/chains';
import { WalletChain } from '@/wallet/types';

export interface PaymentRequest {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  chain: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  description?: string;
}

export interface PaymentLink {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  description: string;
  chain: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  paymentUrl: string;
  createdAt: string;
  expiresAt: string;
}

export async function createPaymentRequest(params: {
  userId: string;
  amount: string;
  currency: string;
  chain?: string;
  description?: string;
  expiresInHours?: number;
}): Promise<PaymentRequest> {
  const chain = params.chain || 'ethereum';
  const expiresInHours = params.expiresInHours || 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency,
      chain,
      description: params.description || '',
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create payment request', error);
    throw new Error('Failed to create payment request');
  }

  return {
    id: data.id,
    userId: data.user_id,
    amount: data.amount,
    currency: data.currency,
    chain: data.chain,
    status: data.status,
    depositAddress: data.deposit_address,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    description: data.description,
  };
}

export async function getPaymentRequest(id: string): Promise<PaymentRequest | null> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    amount: data.amount,
    currency: data.currency,
    chain: data.chain,
    status: data.status,
    depositAddress: data.deposit_address,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    description: data.description,
  };
}

export async function createPaymentLink(params: {
  userId: string;
  amount: string;
  currency: string;
  description?: string;
  chain?: string;
  expiresInHours?: number;
}): Promise<PaymentLink> {
  const chain = params.chain || 'ethereum';
  const expiresInHours = params.expiresInHours || 168; // 7 days
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_links')
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency,
      description: params.description || '',
      chain,
      status: 'active',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create payment link', error);
    throw new Error('Failed to create payment link');
  }

  const paymentUrl = `${getEnv('NEXT_PUBLIC_APP_URL') ?? ''}/pay/${data.id}`;

  return {
    id: data.id,
    userId: data.user_id,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    chain: data.chain,
    status: data.status,
    paymentUrl,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

export async function getPaymentLink(id: string): Promise<PaymentLink | null> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const paymentUrl = `${getEnv('NEXT_PUBLIC_APP_URL') ?? ''}/pay/${data.id}`;

  return {
    id: data.id,
    userId: data.user_id,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    chain: data.chain,
    status: data.status,
    paymentUrl,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

export async function getUserPaymentRequests(userId: string, limit = 50): Promise<PaymentRequest[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch payment requests', error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    amount: item.amount,
    currency: item.currency,
    chain: item.chain,
    status: item.status,
    depositAddress: item.deposit_address,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
    description: item.description,
  }));
}

export async function getUserPaymentLinks(userId: string, limit = 50): Promise<PaymentLink[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch payment links', error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    amount: item.amount,
    currency: item.currency,
    description: item.description,
    chain: item.chain,
    status: item.status,
    paymentUrl: `${getEnv('NEXT_PUBLIC_APP_URL') ?? ''}/pay/${item.id}`,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
  }));
}

export async function getTransactionHistory(userId: string, chain?: ChainKey): Promise<any[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (chain) {
    query = query.eq('chain', chain);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch transaction history', error);
    return [];
  }

  return data || [];
}

export async function payRequest(paymentId: string, userId: string, chain: ChainKey): Promise<void> {
  // Placeholder for payment processing logic
  // In a real implementation, this would:
  // 1. Verify the payment request exists and is valid
  // 2. Process the blockchain transaction
  // 3. Update the payment status
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'paid' })
    .eq('id', paymentId);

  if (error) {
    logger.error('Failed to update payment request', error);
    throw new Error('Failed to process payment');
  }
}

// Export all functions as a service object for convenience
export const paymentService = {
  createPaymentRequest,
  getPaymentRequest,
  createPaymentLink,
  getPaymentLink,
  getUserPaymentRequests,
  getUserPaymentLinks,
  getTransactionHistory,
  payRequest,
};
